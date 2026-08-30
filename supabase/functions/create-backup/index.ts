import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting backup process...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role key for full access
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this is an authenticated request (manual backup) or cron job
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      const supabaseClient = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      
      if (userError) {
        console.error('Auth error:', userError);
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if user is admin
      const { data: isAdmin } = await supabaseAdmin.rpc('has_role', { 
        _user_id: user?.id, 
        _role: 'admin' 
      });

      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      userId = user?.id || null;
    }

    console.log('Fetching data from all tables...');

    // Fetch all data from tables
    const [
      profilesResult,
      challengeProgressResult,
      progressPhotosResult,
      taskRemindersResult,
      userRolesResult
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*'),
      supabaseAdmin.from('challenge_progress').select('*'),
      supabaseAdmin.from('progress_photos').select('*'),
      supabaseAdmin.from('task_reminders').select('*'),
      supabaseAdmin.from('user_roles').select('*')
    ]);

    // Check for errors
    const errors = [];
    if (profilesResult.error) errors.push(`profiles: ${profilesResult.error.message}`);
    if (challengeProgressResult.error) errors.push(`challenge_progress: ${challengeProgressResult.error.message}`);
    if (progressPhotosResult.error) errors.push(`progress_photos: ${progressPhotosResult.error.message}`);
    if (taskRemindersResult.error) errors.push(`task_reminders: ${taskRemindersResult.error.message}`);
    if (userRolesResult.error) errors.push(`user_roles: ${userRolesResult.error.message}`);

    if (errors.length > 0) {
      console.error('Errors fetching data:', errors);
      return new Response(JSON.stringify({ error: 'Failed to fetch some tables', details: errors }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create backup object
    const backupData = {
      backup_timestamp: new Date().toISOString(),
      tables: {
        profiles: {
          count: profilesResult.data?.length || 0,
          data: profilesResult.data || []
        },
        challenge_progress: {
          count: challengeProgressResult.data?.length || 0,
          data: challengeProgressResult.data || []
        },
        progress_photos: {
          count: progressPhotosResult.data?.length || 0,
          data: progressPhotosResult.data || []
        },
        task_reminders: {
          count: taskRemindersResult.data?.length || 0,
          data: taskRemindersResult.data || []
        },
        user_roles: {
          count: userRolesResult.data?.length || 0,
          data: userRolesResult.data || []
        }
      },
      metadata: {
        total_profiles: profilesResult.data?.length || 0,
        total_challenge_progress: challengeProgressResult.data?.length || 0,
        total_photos: progressPhotosResult.data?.length || 0,
        total_reminders: taskRemindersResult.data?.length || 0,
        total_roles: userRolesResult.data?.length || 0
      }
    };

    const backupJson = JSON.stringify(backupData);
    const fileSizeBytes = new TextEncoder().encode(backupJson).length;

    console.log(`Backup created. Size: ${fileSizeBytes} bytes`);

    // Save backup to database
    const { data: savedBackup, error: saveError } = await supabaseAdmin
      .from('backups')
      .insert({
        backup_data: backupData,
        backup_type: 'full',
        file_size_bytes: fileSizeBytes,
        created_by: userId
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving backup:', saveError);
      return new Response(JSON.stringify({ error: 'Failed to save backup', details: saveError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Backup saved successfully:', savedBackup.id);

    // Clean up old backups (keep last 30)
    const { data: allBackups } = await supabaseAdmin
      .from('backups')
      .select('id, created_at')
      .order('created_at', { ascending: false });

    if (allBackups && allBackups.length > 30) {
      const backupsToDelete = allBackups.slice(30).map(b => b.id);
      await supabaseAdmin
        .from('backups')
        .delete()
        .in('id', backupsToDelete);
      console.log(`Cleaned up ${backupsToDelete.length} old backups`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      backup_id: savedBackup.id,
      metadata: backupData.metadata,
      file_size_bytes: fileSizeBytes
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-backup function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
