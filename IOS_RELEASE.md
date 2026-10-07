# Hard 21 — رفع نسخة iOS

كل شي ما يحتاج ماك صار جاهز بالمشروع. هذا الملف بيه اللي باقي: أول قسم تسويه من أي حاسبة (مواقع وحسابات)، وثاني قسم على الماك (حوالي نص ساعة).

## الجاهز بالمشروع

- مجلد `ios/` (Xcode project) بالمعرّف `com.hardchallenge.app`، الإصدار **1.6 (1)**، آيفون فقط، عمودي فقط، iOS 14 وأحدث.
- الأيقونة 1024×1024 بدون شفافية، وشاشة البداية (الـ21 الوردي على الأسود) — من `scripts/generate-ios-assets.cjs`.
- `Info.plist`: الاسم "Hard 21"، العربية لغة أساسية، إذن الكاميرا (QR الحضور)، إعفاء التشفير، معرّف AdMob التجريبي (الإعلانات مطفية).
- `PrivacyInfo.xcprivacy` (ملف الخصوصية الإلزامي) و`App.entitlements` (Sign in with Apple).
- **تسجيل الدخول بـApple** (شرط Apple لأن عندنا Google) — يطلع بس على iPhone.
- **Google على iPhone** — يشتغل من تحط iOS Client ID (الخطوة 4). لحد ذاك يختفي زره على iPhone.
- **الدفع الداخلي مال Apple**: على iPhone كل الشراءات تمر من App Store، وأندرويد يبقى على WAYL.
  - السيرفر يتحقق من توقيع Apple (`apple-iap` و`apple-iap-notify` منشورات على Supabase)، وقاعدة البيانات جاهزة (`apple_owners`، `apple_apply_transaction`).
  - صفحة الاشتراك على iPhone: أسعار App Store، زر استرجاع المشتريات، إدارة الاشتراك، نص التجديد التلقائي، روابط الشروط والخصوصية.
- صور المتجر 1290×2796 (عربي وإنكليزي): `store-screenshots/hard21-store-screenshots.zip` → `app-store/`.

---

## القسم الأول: بدون ماك (من المتصفح)

### 1. حساب Apple Developer
- اشترك بـ [Apple Developer Program](https://developer.apple.com/programs/) (99$ سنوياً).

### 2. App ID
[Certificates, IDs & Profiles → Identifiers](https://developer.apple.com/account/resources/identifiers/list) → **+** → App IDs → App:
- Bundle ID (Explicit): `com.hardchallenge.app`
- Capabilities: فعّل **Sign in with Apple**. (In-App Purchase مفعّل تلقائياً.)

### 3. التطبيق بـ App Store Connect
[App Store Connect → Apps](https://appstoreconnect.apple.com/apps) → **+** → New App:
- Platform: iOS — Name: `Hard 21` (إذا محجوز: `Hard 21 – تحدي العادات`)
- Primary Language: Arabic — Bundle ID: `com.hardchallenge.app` — SKU: `hard21-ios`

بعدها:
- **Agreements, Tax, and Banking**: وقّع **Paid Applications Agreement** وكمّل البنك والضرائب. بدونها الشراء ما يشتغل.
- **App Information → App Store Server Notifications**: حط نفس الرابط بـ Production وSandbox، واختار **Version 2**:
  ```
  https://zmkgbotvmfpsrvvgztxn.supabase.co/functions/v1/apple-iap-notify
  ```

### 4. منتجات الشراء (لازم المعرّفات بالضبط)
**Monetization → Subscriptions** → Subscription Group باسم `Hard 21 Premium`:

| Product ID | النوع | المدة | سعر مقترح* |
|---|---|---|---|
| `com.hardchallenge.app.premium.monthly` | Auto-Renewable Subscription | 1 Month | 3.99$ |

**Monetization → In-App Purchases**:

| Product ID | النوع | يعطي | سعر مقترح* |
|---|---|---|---|
| `com.hardchallenge.app.premium.lifetime` | Non-Consumable | بريميوم مدى الحياة | 14.99$ |
| `com.hardchallenge.app.gems.100` | Consumable | 100 نقطة | 0.99$ |
| `com.hardchallenge.app.gems.500` | Consumable | 500 نقطة | 3.99$ |
| `com.hardchallenge.app.gems.1000` | Consumable | 1000 نقطة | 7.99$ |

\* تقريباً بنفس أسعار WAYL (5,000 / 20,000 / 1,000 دينار). Apple تاخذ 15% (سجّل بـ [Small Business Program](https://developer.apple.com/app-store/small-business-program/)).

لكل منتج: اسم ووصف بالعربي والإنكليزي، وصورة (Review Screenshot) لصفحة الشراء من التطبيق.

### 5. Google على iPhone
1. [Google Cloud → Credentials](https://console.cloud.google.com/apis/credentials) (نفس مشروع الـ Web client) → Create Credentials → OAuth client ID → **iOS** → Bundle ID: `com.hardchallenge.app`.
2. انسخ الـ Client ID (`xxxx.apps.googleusercontent.com`) وحطه:
   - بملف `.env`: `VITE_GOOGLE_IOS_CLIENT_ID=xxxx.apps.googleusercontent.com`
   - بـ `ios/App/App/Info.plist`: بدّل `REPLACE_WITH_IOS_CLIENT_ID` بالجزء `xxxx` (يصير `com.googleusercontent.apps.xxxx`).
3. Supabase → Authentication → Providers → **Google** → Client IDs: أضف الـ iOS Client ID بعد الموجود، مفصولة بفارزة.

### 6. Apple بـ Supabase
Supabase → Authentication → Providers → **Apple** → Enable → Client IDs: `com.hardchallenge.app` → Save. (الدخول من التطبيق نفسه ما يحتاج Secret Key.)

### 7. صفحة التطبيق بالمتجر
- **Category**: Health & Fitness (والثانوية Lifestyle).
- **Privacy Policy URL**: `https://merry-dragon-9e3add.netlify.app/privacy.html` (بعد ما ترفع الموقع الجديد).
- **Support URL**: `https://merry-dragon-9e3add.netlify.app`
- **App Privacy** (Data collection) — كلها "Linked to user"، "Used for App Functionality"، و**بدون Tracking**:
  Email Address، Name، User ID، Purchase History، Product Interaction، Other User Content.
- **Age Rating**: جاوب "None" على كل شي → 4+.
- **Screenshots (6.9")**: من `store-screenshots/hard21-store-screenshots.zip` → `app-store/ar` و`app-store/en`.
- **Sign-In Information** لفريق المراجعة: سوّي حساب تجريبي بالإيميل وكلمة سر وحطهن هنا.

نص مقترح:
- **Subtitle**: تحدّي 21 يوم لبناء عاداتك
- **Promotional Text**: 21 يوم تغيّرك. مهام يومية، سلسلة التزام، صناديق وجواهر، ودوري أسبوعي.
- **Keywords**: عادات,تحدي,انضباط,روتين,لياقة,تطوير الذات,21 يوم,habits,challenge,streak
- **Description**:
  ```
  Hard 21 يحوّل بناء العادات إلى لعبة ما تكدر توكف عنها.

  • مهام يومية واضحة: تمرين، نوم، ماء، قراءة، أكل صحي.
  • سلسلة التزام تكبر كل يوم — ولا تكسرها.
  • كل 3 أيام كاملة صندوق: جواهر وإطارات وثيمات.
  • وحش أسبوعي يواجهه الكل، وكل مهمة ضربة بيه.
  • دوري أسبوعي ولوحة متصدّرين وبطل كل أسبوع.
  • 3 مسارات متدرّجة: 21 ثم 45 ثم 75 يوماً.
  • 8 شخصيات ومتجر ثيمات.

  اشتراك بريميوم اختياري: بدون إعلانات، مهامك الخاصة، وكل المسارات.
  يتجدد الاشتراك الشهري تلقائياً ما لم يُلغَ قبل 24 ساعة من نهاية الفترة.
  شروط الاستخدام: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
  ```

---

## القسم الثاني: على الماك

```bash
# مرة وحدة
xcode-select --install
sudo gem install cocoapods
```

```bash
# بمجلد المشروع
npm ci
npm run build
npx cap sync ios
npx cap open ios
```

`npx cap sync ios` يسوي `pod install` (الشي الوحيد اللي ما صار على ويندوز).

بـ Xcode:
1. Target **App** → **Signing & Capabilities** → Team: حسابك. لازم يطلع **Sign in with Apple** (من `App.entitlements`). اضغط **+ Capability** → **In-App Purchase**.
2. شغّل على آيفون حقيقي بالكيبل، أو على المحاكي.
3. جرّب:
   - الدخول بـApple وبالإيميل.
   - الشراء بحساب Sandbox (App Store Connect → Users and Access → Sandbox → Testers)، وتأكد إن البريميوم أو الجواهر تفعّلت.
   - **استرجاع المشتريات** من صفحة الاشتراك.
   - مسح QR الحضور (حساب موظف ناس).
4. **Product → Archive** → Distribute App → App Store Connect → Upload.
5. بـ App Store Connect: اختار الـ Build، وأضف منتجات الشراء للإصدار (In-App Purchases and Subscriptions)، وبعدين **Submit for Review**.

> كل إصدار جديد لـ iOS: ارفع `CURRENT_PROJECT_VERSION` (Build) بـ Xcode. وإذا تغيّرت الميزات، ارفع `MARKETING_VERSION` هم.

---

## ملاحظات

- **أندرويد ما يتأثر**: مكتبة دفع Apple مستثناة منه (`android.includePlugins` بـ `capacitor.config.ts`). أي مكتبة Capacitor جديدة تضيفها لازم تنضاف لهذي القائمة هم.
- **الإعلانات**: إذا شغّلتها على iOS، تحتاج AdMob iOS App ID حقيقي (`GADApplicationIdentifier`)، ونافذة تتبّع (ATT)، وتعديل App Privacy.
- **بدون ماك؟** [Codemagic](https://codemagic.io) يبني ويرفع لـ TestFlight على ماك سحابي.
