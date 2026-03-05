# Anime4Giant - عملاق الانيمي

## 🚀 كيف تجعل الموقع يعمل فوراً؟

لديك خياران للرفع:

### الخيار الأول: الرفع المباشر (الأسهل والأضمن)
1. قم بفك الضغط عن هذا الملف.
2. ارفع ملف **`standalone.html`** إلى Netlify أو GitHub Pages.
3. قم بتغيير اسمه إلى **`index.html`** بعد الرفع.
4. **هام جداً:** يجب عليك إضافة رابط موقعك الجديد (مثلاً: `https://your-site.netlify.app`) إلى قائمة **"Authorized Domains"** في إعدادات Firebase الخاصة بك، وإلا فلن يتم تحميل البيانات.

### الخيار الثاني: الرفع عبر GitHub (للمحترفين)
1. ارفع كل هذه الملفات إلى مستودع جديد على GitHub.
2. اربط المستودع بـ Netlify.
3. استخدم الإعدادات التالية في Netlify:
   - **Build Command:** `npm run build`
   - **Publish directory:** `dist`
4. تأكد من إضافة رابط Netlify إلى Firebase Authorized Domains.

### لماذا تظهر شاشة سوداء أو لا يفتح الموقع؟
1. **عدم تفعيل الدومين في Firebase:** اذهب إلى Firebase Console -> Authentication -> Settings -> Authorized Domains وأضف رابط موقعك.
2. **استخدام ملفات المصدر مباشرة:** المتصفح لا يفهم ملفات `.tsx` مباشرة، يجب استخدام ملف `standalone.html` أو عمل Build للمشروع.
3. **مشكلة في الاتصال:** تأكد من أن مفاتيح Firebase في ملف `firebase.ts` صحيحة وتعمل.
