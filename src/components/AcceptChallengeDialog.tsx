import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

interface AcceptChallengeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathTitle: string;
  onAccept: () => void;
}

export const AcceptChallengeDialog = ({
  open,
  onOpenChange,
  pathTitle,
  onAccept,
}: AcceptChallengeDialogProps) => {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-primary" />
          </div>
          <AlertDialogTitle className="text-center text-xl">
            {t('paths.acceptChallengeTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-base">
            {t('paths.acceptChallengeDescription', { path: pathTitle })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <AlertDialogCancel className="w-full sm:w-auto">
            {t('paths.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onAccept}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90"
          >
            {t('paths.acceptChallenge')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
