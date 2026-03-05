export default `
export type Category = 'open' | 'super';

export interface Video {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  category: Category;
  isElite: boolean;
  timestamp: number;
  allowDownload?: boolean;
  sourceUrl?: string;
}

export interface Book {
  id: string;
  title: string;
  description: string;
  bookUrl: string;
  thumbnailUrl: string;
  category: Category;
  isElite: boolean;
  timestamp: number;
  allowDownload?: boolean;
  sourceUrl?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration: number;
  unit: DurationUnit;
  whatsapp?: string;
}

export type DurationUnit = 'days' | 'hours' | 'minutes' | 'seconds' | 'months';

export type View = 'home' | 'posts-list' | 'post-view' | 'novels' | 'forum' | 'notifications' | 'admin' | 'profile' | 'seasons' | 'settings' | 'search' | 'season-view' | 'about-us' | 'contact-us' | 'terms-conditions' | 'privacy-policy';

export interface ForumMessage {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  text: string;
  timestamp: number;
  replyTo?: {
    id: string;
    userName: string;
    text: string;
  } | null;
  isAdmin?: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  text: string;
  timestamp: number;
  mediaId: string;
  replyText?: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  images: string[];
  timestamp: number;
  authorName: string;
  authorPhoto: string;
  adminName?: string;
  sourceUrl?: string;
}

export interface Season {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoIds: string[];
  timestamp: number;
  category: Category;
}

export const translations = {
  ar: {
    siteName: "عملاق4الانيمي", home: "الرئيسية", premium: "بوابة العمالقة", novels: "خزانة الروايات", forum: "مجلس العمالقة", notifications: "التنبيهات", admin: "وحدة القيادة", superGiant: "حصريات النخبة", freeVideos: "فيديوهات متاحة", freeNovels: "روايات متاحة", superNovels: "روايات النخبة", back: "رجوع", send: "إرسال", subStatus: "حالة الاشتراك", active: "نشط", expired: "منتهي", days: "أيام", hours: "ساعة", minutes: "دقيقة", seconds: "ثانية", loginTitle: "بوابة دخول العمالقة", yourName: "اسم العملاق", enterWorld: "دخول عالم العمالقة", contactUs: "اتصل بنا", aboutUs: "من نحن",    privacyPolicy: "الخصوصية والأمان", joinUs: "انضم إلينا", dir: "rtl", lang: "العربية", subType: "نوع الباقة", timeLeft: "الوقت المتبقي", subscribeNow: "تفعيل العملاق الآن", le: "جنية", viewFromSource: "المشاهدة من المصدر", viewOriginal: "المشغل الأصلي", comments: "التعليقات", writeComment: "اكتب تعليقك هنا...", forumPlaceholder: "اكتب رسالة للمجلس...", reply: "رد", edit: "تعديل", delete: "حذف", unit: "الوحدة", price: "السعر", duration: "المدة", addBtn: "إضافة الآن", postsTitle: "المنشورات", management: "إدارة", requests: "الطلبات", content: "المحتوى", plans: "الباقات", users: "الأعضاء", posts: "المنشورات", elite: "النخبة", free: "متاح", loginPrompt: "الوصول للعمالقة فقط", approve: "تفعيل", forumMgmt: "المجلس", noRequests: "لا توجد طلبات حالياً", noMessages: "لا توجد رسائل في المجلس", uploadImg: "رفع صورة", imgLink: "رابط صورة", deleteAll: "حذف الكل", subscribePrompt: "اشترك في باقة لتستفيد من الميزات العملاقة", profile: "ملف العملاق", logout: "تسجيل خروج", requestsTab: "الطلبات", contentTab: "المحتوى", plansTab: "الباقات", usersTab: "الأعضاء", forumTab: "المجلس", commentsTab: "التعليقات", adminRank: "ملك العمالقة", userRank: "عملاق", forumLocked: "هذا المجلس مخصص للعمالقة المشتركين فقط. فعل اشتراكك لتنضم إلينا!", replyTo: "رد على", mute: "كتم المراسلة", unmute: "إلغاء الكتم", ban: "طرد العملاق", unban: "إعادة العملاق", uploadFromDevice: "من الجهاز", uploadFromUrl: "رابط خارجي", timeLeftShort: "متبقي", sourceUrl: "رابط المصدر", months: "أشهر", terms: "الشروط والأحكام", cookieConsent: "نحن نستخدم ملفات تعريف الارتباط لتحسين تجربتك. باستخدامك لموقعنا، فإنك توافق على ذلك.", accept: "موافق",
    yourAccount: "حسابك", linkKey: "مفتاح الربط", loginWithKey: "الدخول بمفتاح الربط", enterKey: "أدخل مفتاح الربط الخاص بك", copyKey: "نسخ المفتاح", keyCopied: "تم النسخ!", keyLogin: "دخول بالمفتاح",
    seasons: "المواسم والمجموعات", addSeason: "إضافة موسم", selectVideos: "اختر الفيديوهات", seasonName: "اسم الموسم", seasonDesc: "وصف الموسم", seasonCover: "غلاف الموسم", search: "بحث", download: "تنزيل", share: "مشاركة", allowDownload: "السماح بالتنزيل", searchPlaceholder: "ابحث عن فيديو، باقة، منشور، أو موسم...", noResults: "لا توجد نتائج للبحث", seasonsTab: "المواسم",
    settingsTab: "الإعدادات", codeTab: "خانة الكود", downloadProject: "تنزيل ملفات المشروع", adminNameLabel: "اسم ملك العمالقة (الأدمن)", saveSettings: "حفظ الإعدادات"
  },
  en: {
    siteName: "Anime4Giant", home: "Home", premium: "Giants Portal", novels: "Novels Vault", forum: "Giants Council", notifications: "Notifications", admin: "Control Unit", superGiant: "Elite Exclusives", freeVideos: "Free Videos", freeNovels: "Free Novels", superNovels: "Elite Novels", back: "Back", send: "Send", subStatus: "Subscription", active: "Active", expired: "Expired", days: "Days", hours: "Hrs", minutes: "Min", seconds: "Sec", loginTitle: "Giants Login", yourName: "Your Name", enterWorld: "Enter World", contactUs: "Contact", aboutUs: "About Us", privacyPolicy: "Privacy Policy", joinUs: "Join Us", dir: "ltr", lang: "English", subType: "Plan", timeLeft: "Time Left", subscribeNow: "Activate Now", le: "EGP", viewFromSource: "View from Source", viewOriginal: "Original", comments: "Comments", writeComment: "Comment...", forumPlaceholder: "Message to council...", reply: "Reply", edit: "Edit", delete: "Delete", unit: "Unit", price: "Price", duration: "Duration", addBtn: "Add Now", postsTitle: "Posts", management: "Management", requests: "Requests", content: "Content", plans: "Plans", users: "Users", posts: "Posts", elite: "Elite", free: "Free", loginPrompt: "Giants Only", approve: "Approve", forumMgmt: "Council", noRequests: "No requests", noMessages: "No messages", uploadImg: "Upload", imgLink: "Image Link", deleteAll: "Delete All", subscribePrompt: "Subscribe to benefit from giant features", profile: "Profile", logout: "Logout", requestsTab: "Requests", contentTab: "Content", plansTab: "Plans", usersTab: "Users", forumTab: "Council", commentsTab: "Comments", adminRank: "Giants King", userRank: "Giant", forumLocked: "Subscribed giants only!", replyTo: "Reply to", mute: "Mute", unmute: "Unmute", ban: "Ban", unban: "Unban", uploadFromDevice: "Device", uploadFromUrl: "External URL", timeLeftShort: "Left", sourceUrl: "Source URL", months: "Months", terms: "Terms & Conditions", cookieConsent: "We use cookies to improve your experience. By using our site, you agree to this.", accept: "Accept",
    yourAccount: "Account", linkKey: "Link Key", loginWithKey: "Login with Key", enterKey: "Enter your link key", copyKey: "Copy Key", keyCopied: "Copied!", keyLogin: "Key Login",
    seasons: "Seasons & Collections", addSeason: "Add Season", selectVideos: "Select Videos", seasonName: "Season Name", seasonDesc: "Description", seasonCover: "Cover Image", search: "Search", download: "Download", share: "Share", allowDownload: "Allow Download", searchPlaceholder: "Search for video, plan, post, or season...", noResults: "No results found", seasonsTab: "Seasons",
    settingsTab: "Settings", codeTab: "Code Section", downloadProject: "Download Project Files", adminNameLabel: "Giants King Name (Admin)", saveSettings: "Save Settings"
  }
};
`;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInR5cGVzLnRzP3JhdyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZGVmYXVsdCBcIlxcbmV4cG9ydCB0eXBlIENhdGVnb3J5ID0gJ29wZW4nIHwgJ3N1cGVyJztcXG5cXG5leHBvcnQgaW50ZXJmYWNlIFZpZGVvIHtcXG4gIGlkOiBzdHJpbmc7XFxuICB0aXRsZTogc3RyaW5nO1xcbiAgZGVzY3JpcHRpb246IHN0cmluZztcXG4gIHZpZGVvVXJsOiBzdHJpbmc7XFxuICB0aHVtYm5haWxVcmw6IHN0cmluZztcXG4gIGNhdGVnb3J5OiBDYXRlZ29yeTtcXG4gIGlzRWxpdGU6IGJvb2xlYW47XFxuICB0aW1lc3RhbXA6IG51bWJlcjtcXG4gIGFsbG93RG93bmxvYWQ/OiBib29sZWFuO1xcbiAgc291cmNlVXJsPzogc3RyaW5nO1xcbn1cXG5cXG5leHBvcnQgaW50ZXJmYWNlIEJvb2sge1xcbiAgaWQ6IHN0cmluZztcXG4gIHRpdGxlOiBzdHJpbmc7XFxuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xcbiAgYm9va1VybDogc3RyaW5nO1xcbiAgdGh1bWJuYWlsVXJsOiBzdHJpbmc7XFxuICBjYXRlZ29yeTogQ2F0ZWdvcnk7XFxuICBpc0VsaXRlOiBib29sZWFuO1xcbiAgdGltZXN0YW1wOiBudW1iZXI7XFxuICBhbGxvd0Rvd25sb2FkPzogYm9vbGVhbjtcXG4gIHNvdXJjZVVybD86IHN0cmluZztcXG59XFxuXFxuZXhwb3J0IGludGVyZmFjZSBTdWJzY3JpcHRpb25QbGFuIHtcXG4gIGlkOiBzdHJpbmc7XFxuICBuYW1lOiBzdHJpbmc7XFxuICBwcmljZTogbnVtYmVyO1xcbiAgZHVyYXRpb246IG51bWJlcjtcXG4gIHVuaXQ6IER1cmF0aW9uVW5pdDtcXG4gIHdoYXRzYXBwPzogc3RyaW5nO1xcbn1cXG5cXG5leHBvcnQgdHlwZSBEdXJhdGlvblVuaXQgPSAnZGF5cycgfCAnaG91cnMnIHwgJ21pbnV0ZXMnIHwgJ3NlY29uZHMnIHwgJ21vbnRocyc7XFxuXFxuZXhwb3J0IHR5cGUgVmlldyA9ICdob21lJyB8ICdwb3N0cy1saXN0JyB8ICdwb3N0LXZpZXcnIHwgJ25vdmVscycgfCAnZm9ydW0nIHwgJ25vdGlmaWNhdGlvbnMnIHwgJ2FkbWluJyB8ICdwcm9maWxlJyB8ICdzZWFzb25zJyB8ICdzZXR0aW5ncycgfCAnc2VhcmNoJyB8ICdzZWFzb24tdmlldycgfCAnYWJvdXQtdXMnIHwgJ2NvbnRhY3QtdXMnIHwgJ3Rlcm1zLWNvbmRpdGlvbnMnIHwgJ3ByaXZhY3ktcG9saWN5JztcXG5cXG5leHBvcnQgaW50ZXJmYWNlIEZvcnVtTWVzc2FnZSB7XFxuICBpZDogc3RyaW5nO1xcbiAgdXNlcklkOiBzdHJpbmc7XFxuICB1c2VyTmFtZTogc3RyaW5nO1xcbiAgdXNlclBob3RvOiBzdHJpbmc7XFxuICB0ZXh0OiBzdHJpbmc7XFxuICB0aW1lc3RhbXA6IG51bWJlcjtcXG4gIHJlcGx5VG8/OiB7XFxuICAgIGlkOiBzdHJpbmc7XFxuICAgIHVzZXJOYW1lOiBzdHJpbmc7XFxuICAgIHRleHQ6IHN0cmluZztcXG4gIH0gfCBudWxsO1xcbiAgaXNBZG1pbj86IGJvb2xlYW47XFxufVxcblxcbmV4cG9ydCBpbnRlcmZhY2UgQXBwTm90aWZpY2F0aW9uIHtcXG4gIGlkOiBzdHJpbmc7XFxuICB0aXRsZTogc3RyaW5nO1xcbiAgbWVzc2FnZTogc3RyaW5nO1xcbiAgdGltZXN0YW1wOiBudW1iZXI7XFxufVxcblxcbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWVudCB7XFxuICBpZDogc3RyaW5nO1xcbiAgdXNlcklkOiBzdHJpbmc7XFxuICB1c2VyTmFtZTogc3RyaW5nO1xcbiAgdXNlclBob3RvOiBzdHJpbmc7XFxuICB0ZXh0OiBzdHJpbmc7XFxuICB0aW1lc3RhbXA6IG51bWJlcjtcXG4gIG1lZGlhSWQ6IHN0cmluZztcXG4gIHJlcGx5VGV4dD86IHN0cmluZztcXG59XFxuXFxuZXhwb3J0IGludGVyZmFjZSBQb3N0IHtcXG4gIGlkOiBzdHJpbmc7XFxuICB0aXRsZTogc3RyaW5nO1xcbiAgY29udGVudDogc3RyaW5nO1xcbiAgaW1hZ2VzOiBzdHJpbmdbXTtcXG4gIHRpbWVzdGFtcDogbnVtYmVyO1xcbiAgYXV0aG9yTmFtZTogc3RyaW5nO1xcbiAgYXV0aG9yUGhvdG86IHN0cmluZztcXG4gIGFkbWluTmFtZT86IHN0cmluZztcXG4gIHNvdXJjZVVybD86IHN0cmluZztcXG59XFxuXFxuZXhwb3J0IGludGVyZmFjZSBTZWFzb24ge1xcbiAgaWQ6IHN0cmluZztcXG4gIHRpdGxlOiBzdHJpbmc7XFxuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xcbiAgdGh1bWJuYWlsVXJsOiBzdHJpbmc7XFxuICB2aWRlb0lkczogc3RyaW5nW107XFxuICB0aW1lc3RhbXA6IG51bWJlcjtcXG4gIGNhdGVnb3J5OiBDYXRlZ29yeTtcXG59XFxuXFxuZXhwb3J0IGNvbnN0IHRyYW5zbGF0aW9ucyA9IHtcXG4gIGFyOiB7XFxuICAgIHNpdGVOYW1lOiBcXFwi2LnZhdmE2KfZgjTYp9mE2KfZhtmK2YXZilxcXCIsIGhvbWU6IFxcXCLYp9mE2LHYptmK2LPZitipXFxcIiwgcHJlbWl1bTogXFxcItio2YjYp9io2Kkg2KfZhNi52YXYp9mE2YLYqVxcXCIsIG5vdmVsczogXFxcItiu2LLYp9mG2Kkg2KfZhNix2YjYp9mK2KfYqlxcXCIsIGZvcnVtOiBcXFwi2YXYrNmE2LMg2KfZhNi52YXYp9mE2YLYqVxcXCIsIG5vdGlmaWNhdGlvbnM6IFxcXCLYp9mE2KrZhtio2YrZh9in2KpcXFwiLCBhZG1pbjogXFxcItmI2K3Yr9ipINin2YTZgtmK2KfYr9ipXFxcIiwgc3VwZXJHaWFudDogXFxcItit2LXYsdmK2KfYqiDYp9mE2YbYrtio2KlcXFwiLCBmcmVlVmlkZW9zOiBcXFwi2YHZitiv2YrZiNmH2KfYqiDZhdiq2KfYrdipXFxcIiwgZnJlZU5vdmVsczogXFxcItix2YjYp9mK2KfYqiDZhdiq2KfYrdipXFxcIiwgc3VwZXJOb3ZlbHM6IFxcXCLYsdmI2KfZitin2Kog2KfZhNmG2K7YqNipXFxcIiwgYmFjazogXFxcItix2KzZiNi5XFxcIiwgc2VuZDogXFxcItil2LHYs9in2YRcXFwiLCBzdWJTdGF0dXM6IFxcXCLYrdin2YTYqSDYp9mE2KfYtNiq2LHYp9mDXFxcIiwgYWN0aXZlOiBcXFwi2YbYtNi3XFxcIiwgZXhwaXJlZDogXFxcItmF2YbYqtmH2YpcXFwiLCBkYXlzOiBcXFwi2KPZitin2YVcXFwiLCBob3VyczogXFxcItiz2KfYudipXFxcIiwgbWludXRlczogXFxcItiv2YLZitmC2KlcXFwiLCBzZWNvbmRzOiBcXFwi2KvYp9mG2YrYqVxcXCIsIGxvZ2luVGl0bGU6IFxcXCLYqNmI2KfYqNipINiv2K7ZiNmEINin2YTYudmF2KfZhNmC2KlcXFwiLCB5b3VyTmFtZTogXFxcItin2LPZhSDYp9mE2LnZhdmE2KfZglxcXCIsIGVudGVyV29ybGQ6IFxcXCLYr9iu2YjZhCDYudin2YTZhSDYp9mE2LnZhdin2YTZgtipXFxcIiwgY29udGFjdFVzOiBcXFwi2KfYqti12YQg2KjZhtinXFxcIiwgYWJvdXRVczogXFxcItmF2YYg2YbYrdmGXFxcIiwgICAgcHJpdmFjeVBvbGljeTogXFxcItin2YTYrti12YjYtdmK2Kkg2YjYp9mE2KPZhdin2YZcXFwiLCBqb2luVXM6IFxcXCLYp9mG2LbZhSDYpdmE2YrZhtinXFxcIiwgZGlyOiBcXFwicnRsXFxcIiwgbGFuZzogXFxcItin2YTYudix2KjZitipXFxcIiwgc3ViVHlwZTogXFxcItmG2YjYuSDYp9mE2KjYp9mC2KlcXFwiLCB0aW1lTGVmdDogXFxcItin2YTZiNmC2Kog2KfZhNmF2KrYqNmC2YpcXFwiLCBzdWJzY3JpYmVOb3c6IFxcXCLYqtmB2LnZitmEINin2YTYudmF2YTYp9mCINin2YTYotmGXFxcIiwgbGU6IFxcXCLYrNmG2YrYqVxcXCIsIHZpZXdGcm9tU291cmNlOiBcXFwi2KfZhNmF2LTYp9mH2K/YqSDZhdmGINin2YTZhdi12K/YsVxcXCIsIHZpZXdPcmlnaW5hbDogXFxcItin2YTZhdi02LrZhCDYp9mE2KPYtdmE2YpcXFwiLCBjb21tZW50czogXFxcItin2YTYqti52YTZitmC2KfYqlxcXCIsIHdyaXRlQ29tbWVudDogXFxcItin2YPYqtioINiq2LnZhNmK2YLZgyDZh9mG2KcuLi5cXFwiLCBmb3J1bVBsYWNlaG9sZGVyOiBcXFwi2KfZg9iq2Kgg2LHYs9in2YTYqSDZhNmE2YXYrNmE2LMuLi5cXFwiLCByZXBseTogXFxcItix2K9cXFwiLCBlZGl0OiBcXFwi2KrYudiv2YrZhFxcXCIsIGRlbGV0ZTogXFxcItit2LDZgVxcXCIsIHVuaXQ6IFxcXCLYp9mE2YjYrdiv2KlcXFwiLCBwcmljZTogXFxcItin2YTYs9i52LFcXFwiLCBkdXJhdGlvbjogXFxcItin2YTZhdiv2KlcXFwiLCBhZGRCdG46IFxcXCLYpdi22KfZgdipINin2YTYotmGXFxcIiwgcG9zdHNUaXRsZTogXFxcItin2YTZhdmG2LTZiNix2KfYqlxcXCIsIG1hbmFnZW1lbnQ6IFxcXCLYpdiv2KfYsdipXFxcIiwgcmVxdWVzdHM6IFxcXCLYp9mE2LfZhNio2KfYqlxcXCIsIGNvbnRlbnQ6IFxcXCLYp9mE2YXYrdiq2YjZiVxcXCIsIHBsYW5zOiBcXFwi2KfZhNio2KfZgtin2KpcXFwiLCB1c2VyczogXFxcItin2YTYo9i52LbYp9ihXFxcIiwgcG9zdHM6IFxcXCLYp9mE2YXZhti02YjYsdin2KpcXFwiLCBlbGl0ZTogXFxcItin2YTZhtiu2KjYqVxcXCIsIGZyZWU6IFxcXCLZhdiq2KfYrVxcXCIsIGxvZ2luUHJvbXB0OiBcXFwi2KfZhNmI2LXZiNmEINmE2YTYudmF2KfZhNmC2Kkg2YHZgti3XFxcIiwgYXBwcm92ZTogXFxcItiq2YHYudmK2YRcXFwiLCBmb3J1bU1nbXQ6IFxcXCLYp9mE2YXYrNmE2LNcXFwiLCBub1JlcXVlc3RzOiBcXFwi2YTYpyDYqtmI2KzYryDYt9mE2KjYp9iqINit2KfZhNmK2KfZi1xcXCIsIG5vTWVzc2FnZXM6IFxcXCLZhNinINiq2YjYrNivINix2LPYp9im2YQg2YHZiiDYp9mE2YXYrNmE2LNcXFwiLCB1cGxvYWRJbWc6IFxcXCLYsdmB2Lkg2LXZiNix2KlcXFwiLCBpbWdMaW5rOiBcXFwi2LHYp9io2Lcg2LXZiNix2KlcXFwiLCBkZWxldGVBbGw6IFxcXCLYrdiw2YEg2KfZhNmD2YRcXFwiLCBzdWJzY3JpYmVQcm9tcHQ6IFxcXCLYp9i02KrYsdmDINmB2Yog2KjYp9mC2Kkg2YTYqtiz2KrZgdmK2K8g2YXZhiDYp9mE2YXZitiy2KfYqiDYp9mE2LnZhdmE2KfZgtipXFxcIiwgcHJvZmlsZTogXFxcItmF2YTZgSDYp9mE2LnZhdmE2KfZglxcXCIsIGxvZ291dDogXFxcItiq2LPYrNmK2YQg2K7YsdmI2KxcXFwiLCByZXF1ZXN0c1RhYjogXFxcItin2YTYt9mE2KjYp9iqXFxcIiwgY29udGVudFRhYjogXFxcItin2YTZhdit2KrZiNmJXFxcIiwgcGxhbnNUYWI6IFxcXCLYp9mE2KjYp9mC2KfYqlxcXCIsIHVzZXJzVGFiOiBcXFwi2KfZhNij2LnYttin2KFcXFwiLCBmb3J1bVRhYjogXFxcItin2YTZhdis2YTYs1xcXCIsIGNvbW1lbnRzVGFiOiBcXFwi2KfZhNiq2LnZhNmK2YLYp9iqXFxcIiwgYWRtaW5SYW5rOiBcXFwi2YXZhNmDINin2YTYudmF2KfZhNmC2KlcXFwiLCB1c2VyUmFuazogXFxcIti52YXZhNin2YJcXFwiLCBmb3J1bUxvY2tlZDogXFxcItmH2LDYpyDYp9mE2YXYrNmE2LMg2YXYrti12LUg2YTZhNi52YXYp9mE2YLYqSDYp9mE2YXYtNiq2LHZg9mK2YYg2YHZgti3LiDZgdi52YQg2KfYtNiq2LHYp9mD2YMg2YTYqtmG2LbZhSDYpdmE2YrZhtinIVxcXCIsIHJlcGx5VG86IFxcXCLYsdivINi52YTZiVxcXCIsIG11dGU6IFxcXCLZg9iq2YUg2KfZhNmF2LHYp9iz2YTYqVxcXCIsIHVubXV0ZTogXFxcItil2YTYutin2KEg2KfZhNmD2KrZhVxcXCIsIGJhbjogXFxcIti32LHYryDYp9mE2LnZhdmE2KfZglxcXCIsIHVuYmFuOiBcXFwi2KXYudin2K/YqSDYp9mE2LnZhdmE2KfZglxcXCIsIHVwbG9hZEZyb21EZXZpY2U6IFxcXCLZhdmGINin2YTYrNmH2KfYslxcXCIsIHVwbG9hZEZyb21Vcmw6IFxcXCLYsdin2KjYtyDYrtin2LHYrNmKXFxcIiwgdGltZUxlZnRTaG9ydDogXFxcItmF2KrYqNmC2YpcXFwiLCBzb3VyY2VVcmw6IFxcXCLYsdin2KjYtyDYp9mE2YXYtdiv2LFcXFwiLCBtb250aHM6IFxcXCLYo9i02YfYsVxcXCIsIHRlcm1zOiBcXFwi2KfZhNi02LHZiNi3INmI2KfZhNij2K3Zg9in2YVcXFwiLCBjb29raWVDb25zZW50OiBcXFwi2YbYrdmGINmG2LPYqtiu2K/ZhSDZhdmE2YHYp9iqINiq2LnYsdmK2YEg2KfZhNin2LHYqtio2KfYtyDZhNiq2K3Ys9mK2YYg2KrYrNix2KjYqtmDLiDYqNin2LPYqtiu2K/Yp9mF2YMg2YTZhdmI2YLYudmG2KfYjCDZgdil2YbZgyDYqtmI2KfZgdmCINi52YTZiSDYsNmE2YMuXFxcIiwgYWNjZXB0OiBcXFwi2YXZiNin2YHZglxcXCIsXFxuICAgIHlvdXJBY2NvdW50OiBcXFwi2K3Ys9in2KjZg1xcXCIsIGxpbmtLZXk6IFxcXCLZhdmB2KrYp9itINin2YTYsdio2LdcXFwiLCBsb2dpbldpdGhLZXk6IFxcXCLYp9mE2K/YrtmI2YQg2KjZhdmB2KrYp9itINin2YTYsdio2LdcXFwiLCBlbnRlcktleTogXFxcItij2K/YrtmEINmF2YHYqtin2K0g2KfZhNix2KjYtyDYp9mE2K7Yp9i1INio2YNcXFwiLCBjb3B5S2V5OiBcXFwi2YbYs9iuINin2YTZhdmB2KrYp9itXFxcIiwga2V5Q29waWVkOiBcXFwi2KrZhSDYp9mE2YbYs9iuIVxcXCIsIGtleUxvZ2luOiBcXFwi2K/YrtmI2YQg2KjYp9mE2YXZgdiq2KfYrVxcXCIsXFxuICAgIHNlYXNvbnM6IFxcXCLYp9mE2YXZiNin2LPZhSDZiNin2YTZhdis2YXZiNi52KfYqlxcXCIsIGFkZFNlYXNvbjogXFxcItil2LbYp9mB2Kkg2YXZiNiz2YVcXFwiLCBzZWxlY3RWaWRlb3M6IFxcXCLYp9iu2KrYsSDYp9mE2YHZitiv2YrZiNmH2KfYqlxcXCIsIHNlYXNvbk5hbWU6IFxcXCLYp9iz2YUg2KfZhNmF2YjYs9mFXFxcIiwgc2Vhc29uRGVzYzogXFxcItmI2LXZgSDYp9mE2YXZiNiz2YVcXFwiLCBzZWFzb25Db3ZlcjogXFxcIti62YTYp9mBINin2YTZhdmI2LPZhVxcXCIsIHNlYXJjaDogXFxcItio2K3Yq1xcXCIsIGRvd25sb2FkOiBcXFwi2KrZhtiy2YrZhFxcXCIsIHNoYXJlOiBcXFwi2YXYtNin2LHZg9ipXFxcIiwgYWxsb3dEb3dubG9hZDogXFxcItin2YTYs9mF2KfYrSDYqNin2YTYqtmG2LLZitmEXFxcIiwgc2VhcmNoUGxhY2Vob2xkZXI6IFxcXCLYp9io2K3YqyDYudmGINmB2YrYr9mK2YjYjCDYqNin2YLYqdiMINmF2YbYtNmI2LHYjCDYo9mIINmF2YjYs9mFLi4uXFxcIiwgbm9SZXN1bHRzOiBcXFwi2YTYpyDYqtmI2KzYryDZhtiq2KfYptisINmE2YTYqNit2KtcXFwiLCBzZWFzb25zVGFiOiBcXFwi2KfZhNmF2YjYp9iz2YVcXFwiLFxcbiAgICBzZXR0aW5nc1RhYjogXFxcItin2YTYpdi52K/Yp9iv2KfYqlxcXCIsIGNvZGVUYWI6IFxcXCLYrtin2YbYqSDYp9mE2YPZiNivXFxcIiwgZG93bmxvYWRQcm9qZWN0OiBcXFwi2KrZhtiy2YrZhCDZhdmE2YHYp9iqINin2YTZhdi02LHZiNi5XFxcIiwgYWRtaW5OYW1lTGFiZWw6IFxcXCLYp9iz2YUg2YXZhNmDINin2YTYudmF2KfZhNmC2KkgKNin2YTYo9iv2YXZhilcXFwiLCBzYXZlU2V0dGluZ3M6IFxcXCLYrdmB2Lgg2KfZhNil2LnYr9in2K/Yp9iqXFxcIlxcbiAgfSxcXG4gIGVuOiB7XFxuICAgIHNpdGVOYW1lOiBcXFwiQW5pbWU0R2lhbnRcXFwiLCBob21lOiBcXFwiSG9tZVxcXCIsIHByZW1pdW06IFxcXCJHaWFudHMgUG9ydGFsXFxcIiwgbm92ZWxzOiBcXFwiTm92ZWxzIFZhdWx0XFxcIiwgZm9ydW06IFxcXCJHaWFudHMgQ291bmNpbFxcXCIsIG5vdGlmaWNhdGlvbnM6IFxcXCJOb3RpZmljYXRpb25zXFxcIiwgYWRtaW46IFxcXCJDb250cm9sIFVuaXRcXFwiLCBzdXBlckdpYW50OiBcXFwiRWxpdGUgRXhjbHVzaXZlc1xcXCIsIGZyZWVWaWRlb3M6IFxcXCJGcmVlIFZpZGVvc1xcXCIsIGZyZWVOb3ZlbHM6IFxcXCJGcmVlIE5vdmVsc1xcXCIsIHN1cGVyTm92ZWxzOiBcXFwiRWxpdGUgTm92ZWxzXFxcIiwgYmFjazogXFxcIkJhY2tcXFwiLCBzZW5kOiBcXFwiU2VuZFxcXCIsIHN1YlN0YXR1czogXFxcIlN1YnNjcmlwdGlvblxcXCIsIGFjdGl2ZTogXFxcIkFjdGl2ZVxcXCIsIGV4cGlyZWQ6IFxcXCJFeHBpcmVkXFxcIiwgZGF5czogXFxcIkRheXNcXFwiLCBob3VyczogXFxcIkhyc1xcXCIsIG1pbnV0ZXM6IFxcXCJNaW5cXFwiLCBzZWNvbmRzOiBcXFwiU2VjXFxcIiwgbG9naW5UaXRsZTogXFxcIkdpYW50cyBMb2dpblxcXCIsIHlvdXJOYW1lOiBcXFwiWW91ciBOYW1lXFxcIiwgZW50ZXJXb3JsZDogXFxcIkVudGVyIFdvcmxkXFxcIiwgY29udGFjdFVzOiBcXFwiQ29udGFjdFxcXCIsIGFib3V0VXM6IFxcXCJBYm91dCBVc1xcXCIsIHByaXZhY3lQb2xpY3k6IFxcXCJQcml2YWN5IFBvbGljeVxcXCIsIGpvaW5VczogXFxcIkpvaW4gVXNcXFwiLCBkaXI6IFxcXCJsdHJcXFwiLCBsYW5nOiBcXFwiRW5nbGlzaFxcXCIsIHN1YlR5cGU6IFxcXCJQbGFuXFxcIiwgdGltZUxlZnQ6IFxcXCJUaW1lIExlZnRcXFwiLCBzdWJzY3JpYmVOb3c6IFxcXCJBY3RpdmF0ZSBOb3dcXFwiLCBsZTogXFxcIkVHUFxcXCIsIHZpZXdGcm9tU291cmNlOiBcXFwiVmlldyBmcm9tIFNvdXJjZVxcXCIsIHZpZXdPcmlnaW5hbDogXFxcIk9yaWdpbmFsXFxcIiwgY29tbWVudHM6IFxcXCJDb21tZW50c1xcXCIsIHdyaXRlQ29tbWVudDogXFxcIkNvbW1lbnQuLi5cXFwiLCBmb3J1bVBsYWNlaG9sZGVyOiBcXFwiTWVzc2FnZSB0byBjb3VuY2lsLi4uXFxcIiwgcmVwbHk6IFxcXCJSZXBseVxcXCIsIGVkaXQ6IFxcXCJFZGl0XFxcIiwgZGVsZXRlOiBcXFwiRGVsZXRlXFxcIiwgdW5pdDogXFxcIlVuaXRcXFwiLCBwcmljZTogXFxcIlByaWNlXFxcIiwgZHVyYXRpb246IFxcXCJEdXJhdGlvblxcXCIsIGFkZEJ0bjogXFxcIkFkZCBOb3dcXFwiLCBwb3N0c1RpdGxlOiBcXFwiUG9zdHNcXFwiLCBtYW5hZ2VtZW50OiBcXFwiTWFuYWdlbWVudFxcXCIsIHJlcXVlc3RzOiBcXFwiUmVxdWVzdHNcXFwiLCBjb250ZW50OiBcXFwiQ29udGVudFxcXCIsIHBsYW5zOiBcXFwiUGxhbnNcXFwiLCB1c2VyczogXFxcIlVzZXJzXFxcIiwgcG9zdHM6IFxcXCJQb3N0c1xcXCIsIGVsaXRlOiBcXFwiRWxpdGVcXFwiLCBmcmVlOiBcXFwiRnJlZVxcXCIsIGxvZ2luUHJvbXB0OiBcXFwiR2lhbnRzIE9ubHlcXFwiLCBhcHByb3ZlOiBcXFwiQXBwcm92ZVxcXCIsIGZvcnVtTWdtdDogXFxcIkNvdW5jaWxcXFwiLCBub1JlcXVlc3RzOiBcXFwiTm8gcmVxdWVzdHNcXFwiLCBub01lc3NhZ2VzOiBcXFwiTm8gbWVzc2FnZXNcXFwiLCB1cGxvYWRJbWc6IFxcXCJVcGxvYWRcXFwiLCBpbWdMaW5rOiBcXFwiSW1hZ2UgTGlua1xcXCIsIGRlbGV0ZUFsbDogXFxcIkRlbGV0ZSBBbGxcXFwiLCBzdWJzY3JpYmVQcm9tcHQ6IFxcXCJTdWJzY3JpYmUgdG8gYmVuZWZpdCBmcm9tIGdpYW50IGZlYXR1cmVzXFxcIiwgcHJvZmlsZTogXFxcIlByb2ZpbGVcXFwiLCBsb2dvdXQ6IFxcXCJMb2dvdXRcXFwiLCByZXF1ZXN0c1RhYjogXFxcIlJlcXVlc3RzXFxcIiwgY29udGVudFRhYjogXFxcIkNvbnRlbnRcXFwiLCBwbGFuc1RhYjogXFxcIlBsYW5zXFxcIiwgdXNlcnNUYWI6IFxcXCJVc2Vyc1xcXCIsIGZvcnVtVGFiOiBcXFwiQ291bmNpbFxcXCIsIGNvbW1lbnRzVGFiOiBcXFwiQ29tbWVudHNcXFwiLCBhZG1pblJhbms6IFxcXCJHaWFudHMgS2luZ1xcXCIsIHVzZXJSYW5rOiBcXFwiR2lhbnRcXFwiLCBmb3J1bUxvY2tlZDogXFxcIlN1YnNjcmliZWQgZ2lhbnRzIG9ubHkhXFxcIiwgcmVwbHlUbzogXFxcIlJlcGx5IHRvXFxcIiwgbXV0ZTogXFxcIk11dGVcXFwiLCB1bm11dGU6IFxcXCJVbm11dGVcXFwiLCBiYW46IFxcXCJCYW5cXFwiLCB1bmJhbjogXFxcIlVuYmFuXFxcIiwgdXBsb2FkRnJvbURldmljZTogXFxcIkRldmljZVxcXCIsIHVwbG9hZEZyb21Vcmw6IFxcXCJFeHRlcm5hbCBVUkxcXFwiLCB0aW1lTGVmdFNob3J0OiBcXFwiTGVmdFxcXCIsIHNvdXJjZVVybDogXFxcIlNvdXJjZSBVUkxcXFwiLCBtb250aHM6IFxcXCJNb250aHNcXFwiLCB0ZXJtczogXFxcIlRlcm1zICYgQ29uZGl0aW9uc1xcXCIsIGNvb2tpZUNvbnNlbnQ6IFxcXCJXZSB1c2UgY29va2llcyB0byBpbXByb3ZlIHlvdXIgZXhwZXJpZW5jZS4gQnkgdXNpbmcgb3VyIHNpdGUsIHlvdSBhZ3JlZSB0byB0aGlzLlxcXCIsIGFjY2VwdDogXFxcIkFjY2VwdFxcXCIsXFxuICAgIHlvdXJBY2NvdW50OiBcXFwiQWNjb3VudFxcXCIsIGxpbmtLZXk6IFxcXCJMaW5rIEtleVxcXCIsIGxvZ2luV2l0aEtleTogXFxcIkxvZ2luIHdpdGggS2V5XFxcIiwgZW50ZXJLZXk6IFxcXCJFbnRlciB5b3VyIGxpbmsga2V5XFxcIiwgY29weUtleTogXFxcIkNvcHkgS2V5XFxcIiwga2V5Q29waWVkOiBcXFwiQ29waWVkIVxcXCIsIGtleUxvZ2luOiBcXFwiS2V5IExvZ2luXFxcIixcXG4gICAgc2Vhc29uczogXFxcIlNlYXNvbnMgJiBDb2xsZWN0aW9uc1xcXCIsIGFkZFNlYXNvbjogXFxcIkFkZCBTZWFzb25cXFwiLCBzZWxlY3RWaWRlb3M6IFxcXCJTZWxlY3QgVmlkZW9zXFxcIiwgc2Vhc29uTmFtZTogXFxcIlNlYXNvbiBOYW1lXFxcIiwgc2Vhc29uRGVzYzogXFxcIkRlc2NyaXB0aW9uXFxcIiwgc2Vhc29uQ292ZXI6IFxcXCJDb3ZlciBJbWFnZVxcXCIsIHNlYXJjaDogXFxcIlNlYXJjaFxcXCIsIGRvd25sb2FkOiBcXFwiRG93bmxvYWRcXFwiLCBzaGFyZTogXFxcIlNoYXJlXFxcIiwgYWxsb3dEb3dubG9hZDogXFxcIkFsbG93IERvd25sb2FkXFxcIiwgc2VhcmNoUGxhY2Vob2xkZXI6IFxcXCJTZWFyY2ggZm9yIHZpZGVvLCBwbGFuLCBwb3N0LCBvciBzZWFzb24uLi5cXFwiLCBub1Jlc3VsdHM6IFxcXCJObyByZXN1bHRzIGZvdW5kXFxcIiwgc2Vhc29uc1RhYjogXFxcIlNlYXNvbnNcXFwiLFxcbiAgICBzZXR0aW5nc1RhYjogXFxcIlNldHRpbmdzXFxcIiwgY29kZVRhYjogXFxcIkNvZGUgU2VjdGlvblxcXCIsIGRvd25sb2FkUHJvamVjdDogXFxcIkRvd25sb2FkIFByb2plY3QgRmlsZXNcXFwiLCBhZG1pbk5hbWVMYWJlbDogXFxcIkdpYW50cyBLaW5nIE5hbWUgKEFkbWluKVxcXCIsIHNhdmVTZXR0aW5nczogXFxcIlNhdmUgU2V0dGluZ3NcXFwiXFxuICB9XFxufTtcXG5cIiJdLCJtYXBwaW5ncyI6IkFBQUEsZUFBZTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTsiLCJuYW1lcyI6W119