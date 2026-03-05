export default `import React, { useState, useEffect, createContext, useContext, useRef, useMemo } from 'react';
import { 
  collection, onSnapshot, query, orderBy, addDoc, doc, 
  deleteDoc, updateDoc, limit, setDoc, where, getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  Video, Book, Category, SubscriptionPlan, View, ForumMessage, 
  AppNotification, Comment, Post, DurationUnit, Season, translations 
} from './types';
import { 
  Home, Flame, MessageSquare, Lock, Settings, Trash2, X, Send, BookOpen, 
  ChevronLeft, Bell, ShieldCheck, Play, PhoneCall, Info, Globe2, ShieldAlert, MessageCircle, ExternalLink, UserPlus, Calendar, Edit3, Newspaper, Reply, LogOut, HardDrive, Camera,
  Video as VideoIcon, UserCircle, Search, Download, Share2, Layers
} from 'lucide-react';

// Safety check for process.env
if (typeof process === 'undefined') {
  (window as any).process = { env: {} };
}

const LOGO_URL = "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?auto=format&fit=crop&q=80&w=400"; 

const formatEmbedUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  
  try {
    // If it's already an embed URL, return it
    if (url.includes('/embed/') || url.includes('/preview') || url.includes('player.') || url.includes('videoembed')) return url;

    const uri = new URL(url);
    
    // YouTube
    if (uri.hostname.includes('youtube.com') || uri.hostname.includes('youtu.be')) {
      let videoId = '';
      if (uri.pathname.includes('/shorts/')) {
        videoId = uri.pathname.split('/shorts/')[1].split('/')[0].split('?')[0];
      } else if (uri.searchParams.has('v')) {
        videoId = uri.searchParams.get('v')!;
      } else if (uri.hostname.includes('youtu.be')) {
        videoId = uri.pathname.split('/')[1];
      }
      if (videoId) return \`https://www.youtube.com/embed/\${videoId}?autoplay=0&rel=0&modestbranding=1&enablejsapi=1&origin=\${window.location.origin}\`;
    }
    
    // Facebook
    if (uri.hostname.includes('facebook.com')) {
      return \`https://www.facebook.com/plugins/video.php?href=\${encodeURIComponent(url)}&show_text=0&width=560\`;
    }
    
    // TikTok
    if (uri.hostname.includes('tiktok.com')) {
      const parts = uri.pathname.split('/');
      const videoId = parts[parts.length - 1] || parts[parts.length - 2];
      if (videoId && !isNaN(Number(videoId))) {
        return \`https://www.tiktok.com/embed/v2/\${videoId}\`;
      }
    }
    
    // Instagram
    if (uri.hostname.includes('instagram.com')) {
      let cleanUrl = url.split('?')[0];
      if (!cleanUrl.endsWith('/')) cleanUrl += '/';
      return \`\${cleanUrl}embed\`;
    }

    // Google Drive
    if (uri.hostname.includes('drive.google.com')) {
      return url.replace(/\\/view(\\?.*)?$/, '/preview').replace(/\\/edit(\\?.*)?$/, '/preview');
    }
    
    // Dailymotion
    if (uri.hostname.includes('dailymotion.com') || uri.hostname.includes('dai.ly')) {
       const videoId = uri.hostname.includes('dai.ly') ? uri.pathname.split('/')[1] : uri.pathname.split('/video/')[1]?.split('_')[0];
       if (videoId) return \`https://www.dailymotion.com/embed/video/\${videoId}\`;
    }

    // Vimeo
    if (uri.hostname.includes('vimeo.com')) {
      const videoId = uri.pathname.split('/').pop();
      if (videoId) return \`https://player.vimeo.com/video/\${videoId}\`;
    }

    // OK.ru
    if (uri.hostname.includes('ok.ru')) {
      const videoId = uri.pathname.split('/').pop();
      if (videoId) return \`https://ok.ru/videoembed/\${videoId}\`;
    }

  } catch (e) {
    return url;
  }
  return url;
};

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AppContext = createContext<any>(null);

const useFileToBase64 = () => {
  return (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
};

const LoadingGiant = () => (
  <div className="fixed inset-0 bg-[#050505] z-[9999] flex flex-col items-center justify-center space-y-8">
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: [0.8, 1.1, 1], opacity: 1 }}
      transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
      className="relative"
    >
      <img src={LOGO_URL} referrerPolicy="no-referrer" className="w-32 h-32 rounded-3xl border-4 border-red-600 shadow-[0_0_50px_rgba(239,68,68,0.5)] object-cover" />
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute -inset-4 border-2 border-dashed border-red-600/30 rounded-full"
      />
    </motion.div>
    <div className="flex flex-col items-center space-y-2">
      <h2 className="text-3xl font-black text-white logo-text-glow tracking-tighter">عملاق4الانيمي</h2>
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
            className="w-2 h-2 bg-red-600 rounded-full"
          />
        ))}
      </div>
    </div>
  </div>
);

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentView, setCurrentView] = useState<View>('home');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [showLogin, setShowLogin] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cookieAccepted, setCookieAccepted] = useState(localStorage.getItem('cookie_accepted') === 'true');
  const [searchQuery, setSearchQuery] = useState("");
  const [adminName, setAdminName] = useState('يسى فرح ملك العمالقه');

  const t = useMemo(() => (translations as any)[language], [language]);

  const loginWithLinkKey = async (key: string) => {
    const q = query(collection(db, 'users'), where('linkKey', '==', key));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const userData = snap.docs[0].data();
      const userId = snap.docs[0].id;
      localStorage.setItem('giant_user_id', userId);
      localStorage.setItem('giant_logged', 'true');
      window.location.reload(); // Reload to apply new user ID
      return true;
    }
    return false;
  };

  useEffect(() => {
    const currentLang = (translations as any)[language];
    document.documentElement.dir = currentLang.dir;
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    let savedId = localStorage.getItem('giant_user_id');
    if (localStorage.getItem('giant_logged') === 'true') setIsLogged(true);
    if (!savedId) { savedId = "user_" + Date.now(); localStorage.setItem('giant_user_id', savedId); }

    const unsubUser = onSnapshot(doc(db, 'users', savedId), async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.isBanned) { 
          alert("أنت مطرود من هذه مملكة."); 
          setIsLogged(false); 
          localStorage.setItem('giant_logged', 'false');
          return; 
        }
        
        // Ensure linkKey exists for existing users
        if (!data.linkKey) {
          const linkKey = "GK-" + Math.random().toString(36).substring(2, 10).toUpperCase();
          await updateDoc(doc(db, 'users', savedId), { linkKey });
        }

        setUser({ id: snap.id, ...data });
        if (data.name === adminName || data.name === 'يسى فرح ملك العمالقه') setIsAdmin(true);
        else setIsAdmin(false);

        if (data.isSubscribed && data.subscriptionEndDate && Number(data.subscriptionEndDate) < Date.now()) {
          await updateDoc(doc(db, 'users', savedId), { isSubscribed: false, subscriptionEndDate: 0 });
        }
      } else {
        const linkKey = "GK-" + Math.random().toString(36).substring(2, 10).toUpperCase();
        const newUser = { id: savedId, name: 'عملاق جديد', photoUrl: LOGO_URL, isSubscribed: false, createdAt: Date.now(), dismissedNotifications: [], linkKey };
        setUser(newUser as any);
        await setDoc(doc(db, 'users', savedId), newUser);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firebase Error:", error);
      setLoading(false); // Stop loading on error
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'admin'), (snap) => {
      if (snap.exists()) {
        setAdminName(snap.data().name);
      }
    });

    onSnapshot(query(collection(db, 'videos'), orderBy('createdAt', 'desc')), s => setVideos(s.docs.map(d => ({id:d.id, ...d.data()} as any))));
    onSnapshot(query(collection(db, 'books'), orderBy('createdAt', 'desc')), s => setBooks(s.docs.map(d => ({id:d.id, ...d.data()} as any))));
    onSnapshot(query(collection(db, 'seasons'), orderBy('createdAt', 'desc')), s => setSeasons(s.docs.map(d => ({id:d.id, ...d.data()} as any))));
    onSnapshot(collection(db, 'subscription_plans'), s => setPlans(s.docs.map(d => ({id:d.id, ...d.data()} as any))));
    onSnapshot(query(collection(db, 'notifications'), orderBy('timestamp', 'desc')), s => setNotifications(s.docs.map(d => ({id:d.id, ...d.data()} as any))));
    onSnapshot(query(collection(db, 'posts'), orderBy('timestamp', 'desc')), s => setPosts(s.docs.map(d => ({id:d.id, ...d.data()} as any))));

    return () => { unsubUser(); unsubSettings(); };
  }, [adminName]);

  useEffect(() => {
    let interval: any;
    if (user?.isSubscribed && typeof user?.subscriptionEndDate === 'number' && user.subscriptionEndDate > 0) {
      interval = setInterval(() => {
        const diff = Number(user.subscriptionEndDate) - Date.now();
        if (diff <= 0) { 
          setRemainingMs(0); 
          if (interval) clearInterval(interval); 
        } else { 
          setRemainingMs(diff); 
        }
      }, 1000);
    } else { 
      setRemainingMs(0); 
    }
    return () => { if (interval) clearInterval(interval); };
  }, [user]);

  return (
    <AppContext.Provider value={{ 
      user, videos, books, seasons, plans, notifications, currentView, setView: setCurrentView, 
      isAdmin, loading, t, selectedMedia, setSelectedMedia,
      selectedSeason, setSelectedSeason,
      language, setLanguage, remainingMs, showLogin, setShowLogin, isLogged, setIsLogged, 
      posts, isMenuOpen, setIsMenuOpen, cookieAccepted, setCookieAccepted, loginWithLinkKey,
      searchQuery, setSearchQuery, adminName
    }}>
      <AnimatePresence mode="wait">
        {loading ? <LoadingGiant key="loader" /> : children}
      </AnimatePresence>
    </AppContext.Provider>
  );
};

const YourAccount = () => {
  const { t, user, isAdmin, remainingMs } = useContext(AppContext);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(user?.linkKey || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return \`\${d}\${t.days} \${h}:\${m}:\${sec}\`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pb-20 px-4">
      <div className="text-center space-y-6">
        <div className="relative inline-block">
          <img src={user?.photoUrl || LOGO_URL} referrerPolicy="no-referrer" className="w-32 h-32 sm:w-48 sm:h-48 rounded-[2rem] sm:rounded-[3rem] border-4 border-red-600 shadow-2xl object-cover mx-auto" />
          <div className="absolute -bottom-2 -right-2 bg-red-600 text-white p-2 rounded-xl shadow-lg">
            <ShieldCheck size={20} />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-5xl font-black text-white logo-text-glow">{user?.name}</h2>
          <p className="text-red-500 font-black uppercase tracking-widest text-xs sm:text-sm">{isAdmin ? t.adminRank : t.userRank}</p>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 font-black uppercase text-[10px]">{t.subStatus}</span>
            <span className={\`px-3 py-1 rounded-full text-[10px] font-black uppercase \${user?.isSubscribed ? 'bg-green-600/20 text-green-500' : 'bg-red-600/20 text-red-500'}\`}>
              {user?.isSubscribed ? t.active : t.expired}
            </span>
          </div>
          {user?.isSubscribed && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-black uppercase text-[10px]">{t.subType}</span>
                <span className="text-white font-black text-sm">{user.subscriptionType}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-black uppercase text-[10px]">{t.timeLeft}</span>
                <span className="text-white font-mono text-sm">{remainingMs > 0 ? formatTime(remainingMs) : "00:00:00"}</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
          <label className="text-gray-500 font-black uppercase text-[10px] block">{t.linkKey}</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-black/40 border border-white/5 p-4 rounded-xl text-white font-mono text-xs sm:text-sm break-all flex items-center justify-center">
              {user?.linkKey}
            </div>
            <button onClick={copyToClipboard} className="bg-red-600 text-white px-4 rounded-xl hover:bg-red-700 transition-all active:scale-95">
              {copied ? <ShieldCheck size={18} /> : <ExternalLink size={18} />}
            </button>
          </div>
          <p className="text-[9px] text-gray-600 font-medium text-center leading-relaxed">
            {t.dir === 'rtl' 
              ? "استخدم هذا المفتاح للدخول إلى حسابك من أي جهاز آخر. حافظ عليه سراً!" 
              : "Use this key to access your account from any other device. Keep it secret!"}
          </p>
        </div>
      </div>
    </div>
  );
};

const FileInput = ({ label, onValueChange, placeholder, value }: { label: string, onValueChange: (val: string) => void, placeholder: string, value?: string }) => {
  const [mode, setMode] = useState<'url' | 'device'>('url');
  const fileRef = useRef<HTMLInputElement>(null);
  const fileToBase64 = useFileToBase64();

  const handleDevice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const b64 = await fileToBase64(file as File);
      onValueChange(b64);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center px-1">
        <label className="text-xs font-black uppercase text-gray-500">{label}</label>
        <div className="flex gap-2">
          <button onClick={() => setMode('url')} className={\`p-1 px-3 rounded-lg text-[9px] font-black uppercase transition-all \${mode === 'url' ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-600'}\`}><Globe2 size={12} className="inline mr-1"/> URL</button>
          <button onClick={() => setMode('device')} className={\`p-1 px-3 rounded-lg text-[9px] font-black uppercase transition-all \${mode === 'device' ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-600'}\`}><HardDrive size={12} className="inline mr-1"/> Device</button>
        </div>
      </div>
      {mode === 'url' ? (
        <input value={value} placeholder={placeholder} onChange={e => onValueChange(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-red-600 transition-all text-xs" />
      ) : (
        <div onClick={() => fileRef.current?.click()} className="w-full bg-white/5 border-2 border-dashed border-white/10 p-4 rounded-xl text-center cursor-pointer hover:border-red-600/50 transition-all text-gray-500 text-[10px]">
          {value ? "تم اختيار ملف" : "Click to Upload From Device"}
          <input type="file" ref={fileRef} className="hidden" onChange={handleDevice} />
        </div>
      )}
    </div>
  );
};

const AdminPanel = () => {
  const { t, videos, books, plans, isAdmin, posts, notifications, seasons, adminName } = useContext(AppContext);
  const [tab, setTab] = useState<'requests' | 'content' | 'plans' | 'users' | 'posts' | 'comments' | 'notifs' | 'seasons' | 'settings' | 'code'>('requests');
  const [sourceCode, setSourceCode] = useState<{ [key: string]: string }>({});
  const [loadingCode, setLoadingCode] = useState(false);

  useEffect(() => {
    if (tab === 'code' && Object.keys(sourceCode).length === 0) {
      fetchCode();
    }
  }, [tab]);

  const fetchCode = async () => {
    setLoadingCode(true);
    const files = ['App.tsx', 'firebase.ts', 'types.ts'];
    const code: { [key: string]: string } = {};
    for (const f of files) {
      try {
        const res = await fetch(\`/\${f}?raw\`);
        if (res.ok) code[f] = await res.text();
      } catch (e) {
        console.error(e);
      }
    }
    setSourceCode(code);
    setLoadingCode(false);
  };
  const [reqs, setReqs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const fileToBase64 = useFileToBase64();
  
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [newPost, setNewPost] = useState<{title: string, content: string, images: string[], sourceUrl: string}>({ title: "", content: "", images: [], sourceUrl: "" });
  const [editingVidId, setEditingVidId] = useState<string | null>(null);
  const [newVid, setNewVid] = useState({ title: "", description: "", thumbnailUrl: "", videoUrl: "", sourceUrl: "", category: 'open' as Category, allowDownload: false });
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [newBook, setNewBook] = useState({ title: "", description: "", thumbnailUrl: "", bookUrl: "", sourceUrl: "", category: 'open' as Category, allowDownload: false });
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [newPlan, setNewPlan] = useState({ name: "", price: 0, whatsapp: "", duration: 30, unit: 'days' as DurationUnit });
  const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null);
  const [newSeason, setNewSeason] = useState({ title: "", description: "", thumbnailUrl: "", category: 'open' as Category, videoIds: [] as string[] });
  const [allComments, setAllComments] = useState<any[]>([]);
  const [newAdminName, setNewAdminName] = useState(adminName);

  useEffect(() => {
    setNewAdminName(adminName);
  }, [adminName]);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  const downloadProjectFiles = async () => {
    setIsDownloading(true);
    setDownloadStatus("جاري تحضير الملفات...");
    const zip = new JSZip();
    const files = [
      { name: 'App.tsx', path: '/App.tsx' },
      { name: 'firebase.ts', path: '/firebase.ts' },
      { name: 'index.html', path: '/index.html' },
      { name: 'index.tsx', path: '/index.tsx' },
      { name: 'metadata.json', path: '/metadata.json' },
      { name: 'package.json', path: '/package.json' },
      { name: 'tsconfig.json', path: '/tsconfig.json' },
      { name: 'types.ts', path: '/types.ts' },
      { name: 'vite.config.ts', path: '/vite.config.ts' },
      { name: '.gitignore', path: '/.gitignore' },
      { name: 'netlify.toml', path: '/netlify.toml' },
      { name: '.nvmrc', path: '/.nvmrc' }
    ];
    
    let appContent = '';
    let firebaseContent = '';
    let typesContent = '';
    let indexHtmlContent = '';

    for (const file of files) {
      try {
        const response = await fetch(\`\${file.path}\${file.path.match(/\\.(tsx?|jsx?|css)$/) ? '?raw' : ''}\`);
        if (response.ok) {
          let content = await response.text();
          if (content.startsWith('export default "') && content.endsWith('"')) {
             try {
               const stringLiteral = content.replace(/^export default /, '').replace(/;$/, '');
               content = JSON.parse(stringLiteral);
             } catch (e) {
               content = content.replace(/^export default "/, '').replace(/"$/, '').replace(/\\\\n/g, '\\n').replace(/\\\\"/g, '"');
             }
          }
          
          if (file.name === 'App.tsx') appContent = content;
          if (file.name === 'firebase.ts') firebaseContent = content;
          if (file.name === 'types.ts') typesContent = content;
          if (file.name === 'index.html') indexHtmlContent = content;

          // Clean index.html from ALL injected scripts and fix Quirks Mode
          if (file.name === 'index.html') {
            content = content.replace(/<script\\s+src="\\/__aistudio_internal_control_plane\\/[^"]+"><\\/script>/g, '');
            content = content.replace(/<script\\s+src="aistudio-iframe\\.js"><\\/script>/g, '');
            content = content.trim(); 
          }
          
          zip.file(file.name, content);
        }
      } catch (err) {
        console.error(\`Failed to fetch \${file.name}\`, err);
      }
    }

    // Create Standalone Version
    const cleanTypes = typesContent.replace(/export\\s+/g, '');
    const cleanFirebase = firebaseContent
      .replace(/import[\\s\\S]*?from\\s+["']firebase\\/.*["'];?/g, '')
      .replace(/export\\s+/g, '');
    const cleanApp = appContent
      .replace(/import[\\s\\S]*?from\\s+['"]\\.\\/.*['"];?/g, '')
      .replace(/import[\\s\\S]*?from\\s+['"]firebase\\/.*['"];?/g, '')
      .replace(/import[\\s\\S]*?from\\s+['"]lucide-react['"];?/g, '')
      .replace(/import[\\s\\S]*?from\\s+['"]framer-motion['"];?/g, '')
      .replace(/import[\\s\\S]*?from\\s+['"]clsx['"];?/g, '')
      .replace(/import[\\s\\S]*?from\\s+['"]tailwind-merge['"];?/g, '')
      .replace(/import[\\s\\S]*?from\\s+['"]jszip['"];?/g, '')
      .replace(/import[\\s\\S]*?from\\s+['"]file-saver['"];?/g, '')
      .replace(/import[\\s\\S]*?React,?\\s*\\{[\\s\\S]*?\\}\\s+from\\s+['"]react['"];?/g, '')
      .replace(/export\\s+default\\s+function\\s+App\\(\\)\\s+\\{/g, 'function App() {')
      .replace(/export\\s+const\\s+/g, 'const ')
      .replace(/export\\s+interface\\s+/g, 'interface ')
      .replace(/export\\s+type\\s+/g, 'type ');

    const standaloneHtml = \`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Anime4Giant - عملاق الانيمي</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
    <script type="importmap">
    {
      "imports": {
        "react": "https://esm.sh/react@18",
        "react-dom": "https://esm.sh/react-dom@18",
        "react-dom/client": "https://esm.sh/react-dom@18/client",
        "firebase/app": "https://esm.sh/firebase@10/app",
        "firebase/firestore": "https://esm.sh/firebase@10/firestore",
        "lucide-react": "https://esm.sh/lucide-react",
        "framer-motion": "https://esm.sh/framer-motion",
        "clsx": "https://esm.sh/clsx",
        "tailwind-merge": "https://esm.sh/tailwind-merge",
        "jszip": "https://esm.sh/jszip",
        "file-saver": "https://esm.sh/file-saver"
      }
    }
    <\/script>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
      body { font-family: 'Cairo', sans-serif; background-color: #050505; color: white; margin: 0; overflow-x: hidden; }
      .glass-effect { background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.05); }
      .logo-text-glow { text-shadow: 0 0 10px rgba(239, 68, 68, 0.8), 0 0 20px rgba(239, 68, 68, 0.4); }
      @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
      #error-display { display: none; position: fixed; inset: 0; background: #000; color: #ff4444; padding: 20px; font-family: monospace; z-index: 9999; overflow: auto; }
    </style>
</head>
<body>
    <div id="root"></div>
    <div id="error-display">
      <h1>خطأ في تحميل الموقع</h1>
      <p>حدث خطأ أثناء محاولة تشغيل الموقع. يرجى التأكد من أنك قمت بإضافة رابط هذا الموقع إلى <b>Authorized Domains</b> في إعدادات Firebase.</p>
      <pre id="error-details"></pre>
    </div>
    <script type="text/babel" data-type="module" data-presets="react,typescript">
        import React, { useState, useEffect, createContext, useContext, useRef, useMemo } from 'react';
        import ReactDOM from 'react-dom/client';
        import { initializeApp } from "firebase/app";
        import { getFirestore, collection, onSnapshot, query, orderBy, addDoc, doc, deleteDoc, updateDoc, limit, setDoc, where, getDocs } from "firebase/firestore";
        import * as LucideIcons from 'lucide-react';
        import { motion, AnimatePresence } from 'framer-motion';
        import { clsx } from 'clsx';
        import { twMerge } from 'tailwind-merge';
        import JSZip from 'jszip';
        import { saveAs } from 'file-saver';

        // Destructure Lucide Icons
        const { Home, Flame, MessageSquare, Lock, Settings, Trash2, X, Send, BookOpen, ChevronLeft, Bell, ShieldCheck, Play, PhoneCall, Info, Globe2, ShieldAlert, MessageCircle, ExternalLink, UserPlus, Calendar, Edit3, Newspaper, Reply, LogOut, HardDrive, Camera, Video: VideoIcon, UserCircle, Search, Download, Share2, Layers } = LucideIcons;

        // Global Constants
        const LOGO_URL = "\${LOGO_URL}";

        // Helper: cn
        function cn(...inputs) {
          return twMerge(clsx(inputs));
        }

        // Types
        \${cleanTypes}

        // Firebase
        \${cleanFirebase}

        // App
        \${cleanApp}

        // Mount
        try {
          const root = ReactDOM.createRoot(document.getElementById('root'));
          root.render(<App />);
        } catch (err) {
          console.error("Mount Error:", err);
          document.getElementById('error-display').style.display = 'block';
          document.getElementById('error-details').innerText = err.stack || err.message;
        }
    <\/script>
</body>
</html>\`;

    zip.file('index.html', indexHtmlContent); // Source index.html
    zip.file('standalone.html', standaloneHtml, { binary: false }); // One-file version
    zip.file('public/_redirects', '/* /index.html 200');

    // Add README.md with instructions
    const readme = \`# Anime4Giant - عملاق الانيمي

## 🚀 كيف تجعل الموقع يعمل فوراً؟

لديك خياران للرفع:

### الخيار الأول: الرفع المباشر (الأسهل والأضمن)
1. قم بفك الضغط عن هذا الملف.
2. ارفع ملف **\\\`standalone.html\\\`** إلى Netlify أو GitHub Pages.
3. قم بتغيير اسمه إلى **\\\`index.html\\\`** بعد الرفع.
4. **هام جداً:** يجب عليك إضافة رابط موقعك الجديد (مثلاً: \\\`https://your-site.netlify.app\\\`) إلى قائمة **"Authorized Domains"** في إعدادات Firebase الخاصة بك، وإلا فلن يتم تحميل البيانات.

### الخيار الثاني: الرفع عبر GitHub (للمحترفين)
1. ارفع كل هذه الملفات إلى مستودع جديد على GitHub.
2. اربط المستودع بـ Netlify.
3. استخدم الإعدادات التالية في Netlify:
   - **Build Command:** \\\`npm run build\\\`
   - **Publish directory:** \\\`dist\\\`
4. تأكد من إضافة رابط Netlify إلى Firebase Authorized Domains.

### لماذا تظهر شاشة سوداء أو لا يفتح الموقع؟
1. **عدم تفعيل الدومين في Firebase:** اذهب إلى Firebase Console -> Authentication -> Settings -> Authorized Domains وأضف رابط موقعك.
2. **استخدام ملفات المصدر مباشرة:** المتصفح لا يفهم ملفات \\\`.tsx\\\` مباشرة، يجب استخدام ملف \\\`standalone.html\\\` أو عمل Build للمشروع.
3. **مشكلة في الاتصال:** تأكد من أن مفاتيح Firebase في ملف \\\`firebase.ts\\\` صحيحة وتعمل.
\`;
    zip.file('README.md', readme);
    
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'anime4giant_project.zip');
    setIsDownloading(false);
    setDownloadStatus("تم التحميل بنجاح!");
    setTimeout(() => setDownloadStatus(null), 3000);
  };

  const saveSettings = async () => {
    if (!newAdminName) return;
    await setDoc(doc(db, 'settings', 'admin'), { name: newAdminName });
    alert(t.saveSettings);
  };

  useEffect(() => {
    if (!isAdmin) return;
    onSnapshot(query(collection(db, 'subscription_requests'), orderBy('timestamp', 'desc')), s => setReqs(s.docs.map(d => ({id:d.id, ...d.data()}))));
    onSnapshot(collection(db, 'users'), s => setUsers(s.docs.map(d => ({id:d.id, ...d.data()}))));
    onSnapshot(query(collection(db, 'comments'), orderBy('timestamp', 'desc')), s => setAllComments(s.docs.map(d => ({id:d.id, ...d.data()}))));
  }, [isAdmin]);

  const handlePostImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 30);
    const b64s = await Promise.all(files.map(f => fileToBase64(f as File)));
    setNewPost(p => ({ ...p, images: [...p.images, ...b64s].slice(0, 30) }));
  };

  const savePost = async () => {
    if (!newPost.title || !newPost.content) return;
    if (editingPostId) {
      await updateDoc(doc(db, 'posts', editingPostId), { ...newPost });
      setEditingPostId(null);
    } else {
      await addDoc(collection(db, 'posts'), { ...newPost, timestamp: Date.now(), adminName: t.adminRank });
    }
    setNewPost({ title: "", content: "", images: [], sourceUrl: "" });
    alert("تم الحفظ بنجاح!");
  };

  const saveVideo = async () => {
    if (!newVid.title || !newVid.videoUrl) return;
    if (editingVidId) {
      await updateDoc(doc(db, 'videos', editingVidId), { ...newVid });
      setEditingVidId(null);
    } else {
      await addDoc(collection(db, 'videos'), { ...newVid, createdAt: Date.now() });
    }
    setNewVid({ title: "", description: "", thumbnailUrl: "", videoUrl: "", sourceUrl: "", category: 'open', allowDownload: false });
    alert("تم الحفظ!");
  };

  const saveBook = async () => {
    if (!newBook.title || !newBook.bookUrl) return;
    if (editingBookId) {
      await updateDoc(doc(db, 'books', editingBookId), { ...newBook });
      setEditingBookId(null);
    } else {
      await addDoc(collection(db, 'books'), { ...newBook, createdAt: Date.now() });
    }
    setNewBook({ title: "", description: "", thumbnailUrl: "", bookUrl: "", sourceUrl: "", category: 'open', allowDownload: false });
    alert("تم الحفظ!");
  };

  const savePlan = async () => {
    if (!newPlan.name || !newPlan.price) return;
    if (editingPlanId) {
      await updateDoc(doc(db, 'subscription_plans', editingPlanId), { ...newPlan });
      setEditingPlanId(null);
    } else {
      await addDoc(collection(db, 'subscription_plans'), { ...newPlan, createdAt: Date.now() });
    }
    setNewPlan({ name: "", price: 0, whatsapp: "", duration: 30, unit: 'days' });
    alert("تم الحفظ!");
  };

  const saveSeason = async () => {
    if (!newSeason.title || !newSeason.thumbnailUrl) return;
    if (editingSeasonId) {
      await updateDoc(doc(db, 'seasons', editingSeasonId), { ...newSeason });
      setEditingSeasonId(null);
    } else {
      await addDoc(collection(db, 'seasons'), { ...newSeason, createdAt: Date.now() });
    }
    setNewSeason({ title: "", description: "", thumbnailUrl: "", category: 'open', videoIds: [] });
    alert("تم حفظ الموسم!");
  };

  const approveUser = async (req: any) => {
    const plan = plans.find((p: any) => p.name === req.planType);
    if (!plan) return;
    let end = Date.now();
    const mult = plan.unit === 'months' ? 2592000000 : plan.unit === 'days' ? 86400000 : plan.unit === 'hours' ? 3600000 : 60000;
    end += plan.duration * mult;
    await updateDoc(doc(db, 'users', req.userId), { isSubscribed: true, subscriptionType: plan.name, subscriptionEndDate: end });
    await deleteDoc(doc(db, 'subscription_requests', req.id));
    await addDoc(collection(db, 'notifications'), { title: "تفعيل العملاق!", message: \`تم تفعيل باقة \${plan.name} بنجاح. استمتع يا بطل!\`, targetId: "home", targetType: "post", timestamp: Date.now() });
  };

  if (!isAdmin) return <div className="h-60 flex items-center justify-center font-black text-red-600 uppercase tracking-widest animate-shake">God Mode Required</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-32 pt-4 px-2 animate-fade-in">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-9 gap-2">
        {(['requests', 'content', 'seasons', 'plans', 'posts', 'users', 'comments', 'notifs', 'settings', 'code'] as const).map(k => (
          <button key={k} onClick={() => setTab(k)} className={\`py-3 px-1 rounded-xl font-black text-[9px] uppercase transition-all duration-300 border border-white/10 \${tab === k ? 'bg-red-600 text-white shadow-lg border-red-500 scale-105' : 'bg-black/20 text-gray-500 hover:bg-white/5'}\`}>
            {k === 'requests' && <PhoneCall size={12} className="inline mb-1 block mx-auto"/>}
            {k === 'content' && <VideoIcon size={12} className="inline mb-1 block mx-auto"/>}
            {k === 'plans' && <ShieldCheck size={12} className="inline mb-1 block mx-auto"/>}
            {k === 'users' && <UserCircle size={12} className="inline mb-1 block mx-auto"/>}
            {k === 'posts' && <Newspaper size={12} className="inline mb-1 block mx-auto"/>}
            {k === 'comments' && <MessageSquare size={12} className="inline mb-1 block mx-auto"/>}
            {k === 'notifs' && <Bell size={12} className="inline mb-1 block mx-auto"/>}
            {k === 'seasons' && <Layers size={12} className="inline mb-1 block mx-auto"/>}
            {k === 'settings' && <Settings size={12} className="inline mb-1 block mx-auto"/>}
            {k === 'code' && <Edit3 size={12} className="inline mb-1 block mx-auto"/>}
            {t[\`\${k}Tab\`] || k}
          </button>
        ))}
      </div>

      {tab === 'requests' && (
        <div className="grid gap-4">
          <h2 className="text-xl font-black uppercase text-white mb-4 border-r-4 border-red-600 pr-4">{t.requestsTab}</h2>
          {reqs.length === 0 ? (
            <div className="p-10 text-center opacity-30 font-black text-xs uppercase">{t.noRequests}</div>
          ) : reqs.map(r => (
            <div key={r.id} className="bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-center sm:text-right">
                <p className="font-black text-white text-lg">{r.userName}</p>
                <p className="text-red-500 text-[10px] font-black uppercase">{r.planType}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => approveUser(r)} className="bg-green-600 px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg">موافقة</button>
                <button onClick={() => deleteDoc(doc(db, 'subscription_requests', r.id))} className="bg-red-600/20 text-red-600 border border-red-600/30 px-6 py-2 rounded-xl text-[10px] font-black uppercase">رفض</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div className="grid gap-4">
          <h2 className="text-xl font-black uppercase text-white mb-4 border-r-4 border-red-600 pr-4">{t.usersTab}</h2>
          {users.map(u => (
            <div key={u.id} className="bg-black/40 backdrop-blur-xl p-5 rounded-[2rem] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 group hover:border-red-600/30 transition-all shadow-xl">
              <div className="flex items-center gap-4">
                <img src={u.photoUrl} className="w-12 h-12 rounded-xl border-2 border-red-600/20 object-cover" />
                <div>
                  <h4 className="font-black text-white text-base">{u.name}</h4>
                  <p className="text-[9px] text-red-500 uppercase">{u.isSubscribed ? \`\${u.subscriptionType}\` : t.free}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                <button onClick={() => updateDoc(doc(db, 'users', u.id), { isMuted: !u.isMuted })} className={\`p-2 px-4 rounded-lg text-[9px] font-black uppercase transition-all \${u.isMuted ? 'bg-gray-600 text-white' : 'bg-yellow-600/20 text-yellow-600 border border-yellow-600/30'}\`}>
                   {u.isMuted ? t.unmute : t.mute}
                </button>
                <button onClick={() => updateDoc(doc(db, 'users', u.id), { isBanned: !u.isBanned })} className={\`p-2 px-4 rounded-lg text-[9px] font-black uppercase transition-all \${u.isBanned ? 'bg-white/5 text-green-500' : 'bg-red-600/20 text-red-600 border border-red-600/30'}\`}>
                   {u.isBanned ? t.unban : t.ban}
                </button>
                <button onClick={() => deleteDoc(doc(db, 'users', u.id))} className="bg-white/5 p-2 rounded-lg text-gray-500 hover:text-red-600 transition-all">
                   <Trash2 size={16}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'content' && (
        <div className="space-y-16">
          <div className="grid md:grid-cols-2 gap-10">
            <div className="glass-effect p-6 sm:p-8 rounded-[2.5rem] space-y-6">
              <h3 className="text-xl font-black text-white flex items-center gap-3 border-b border-white/10 pb-4"><VideoIcon className="text-red-600"/> {editingVidId ? "تعديل فيديو" : "إضافة فيديو جديد"}</h3>
              <input placeholder="العنوان" value={newVid.title} onChange={e => setNewVid({...newVid, title: e.target.value})} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white text-xs outline-none" />
              <textarea placeholder="الوصف" value={newVid.description} onChange={e => setNewVid({...newVid, description: e.target.value})} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl h-20 text-white text-xs outline-none" />
              <FileInput label="الفيديو (YouTube/External)" placeholder="رابط الفيديو" value={newVid.videoUrl} onValueChange={(val) => setNewVid({...newVid, videoUrl: val})} />
              <FileInput label="الصورة المصغرة" placeholder="رابط الصورة" value={newVid.thumbnailUrl} onValueChange={(val) => setNewVid({...newVid, thumbnailUrl: val})} />
              <input placeholder={t.sourceUrl} value={newVid.sourceUrl} onChange={e => setNewVid({...newVid, sourceUrl: e.target.value})} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white text-xs" />
              <select value={newVid.category} onChange={e => setNewVid({...newVid, category: e.target.value as any})} className="w-full bg-black border border-white/10 p-3 rounded-xl text-white text-xs">
                <option value="open">متاح للجميع</option>
                <option value="super">خاص بالنخبة</option>
              </select>
              <div className="flex items-center gap-2 px-2">
                <input type="checkbox" checked={newVid.allowDownload} onChange={e => setNewVid({...newVid, allowDownload: e.target.checked})} className="accent-red-600" />
                <span className="text-xs text-gray-400">{t.allowDownload}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={saveVideo} className="flex-1 bg-red-600 py-3 rounded-xl font-black uppercase text-[10px] shadow-lg shadow-red-600/20 text-white">{editingVidId ? "حفظ التعديلات" : "إضافة فيديو"}</button>
                {editingVidId && <button onClick={() => { setEditingVidId(null); setNewVid({ title: "", description: "", thumbnailUrl: "", videoUrl: "", sourceUrl: "", category: 'open', allowDownload: false }); }} className="bg-white/10 px-4 rounded-xl text-[10px] font-black uppercase text-white">إلغاء</button>}
              </div>
            </div>
            <div className="glass-effect p-6 sm:p-8 rounded-[2.5rem] space-y-6">
              <h3 className="text-xl font-black text-white flex items-center gap-3 border-b border-white/10 pb-4"><BookOpen className="text-red-600"/> {editingBookId ? "تعديل رواية" : "إضافة رواية جديدة"}</h3>
              <input placeholder="العنوان" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white text-xs outline-none" />
              <textarea placeholder="الوصف" value={newBook.description} onChange={e => setNewBook({...newBook, description: e.target.value})} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl h-20 text-white text-xs outline-none" />
              <FileInput label="الرواية (Google Drive/PDF)" placeholder="رابط الرواية" value={newBook.bookUrl} onValueChange={(val) => setNewBook({...newBook, bookUrl: val})} />
              <FileInput label="الصورة المصغرة" placeholder="رابط الصورة" value={newBook.thumbnailUrl} onValueChange={(val) => setNewBook({...newBook, thumbnailUrl: val})} />
              <input placeholder={t.sourceUrl} value={newBook.sourceUrl} onChange={e => setNewBook({...newBook, sourceUrl: e.target.value})} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white text-xs" />
              <select value={newBook.category} onChange={e => setNewBook({...newBook, category: e.target.value as any})} className="w-full bg-black border border-white/10 p-3 rounded-xl text-white text-xs">
                <option value="open">متاح للجميع</option>
                <option value="super">خاص بالنخبة</option>
              </select>
              <div className="flex items-center gap-2 px-2">
                <input type="checkbox" checked={newBook.allowDownload} onChange={e => setNewBook({...newBook, allowDownload: e.target.checked})} className="accent-red-600" />
                <span className="text-xs text-gray-400">{t.allowDownload}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={saveBook} className="flex-1 bg-red-600 py-3 rounded-xl font-black uppercase text-[10px] shadow-lg shadow-red-600/20 text-white">{editingBookId ? "حفظ التعديلات" : "إضافة رواية"}</button>
                {editingBookId && <button onClick={() => { setEditingBookId(null); setNewBook({ title: "", description: "", thumbnailUrl: "", bookUrl: "", sourceUrl: "", category: 'open', allowDownload: false }); }} className="bg-white/10 px-4 rounded-xl text-[10px] font-black uppercase text-white">إلغاء</button>}
              </div>
            </div>
          </div>
          <div className="space-y-8">
            <h3 className="text-xl font-black uppercase border-r-4 border-red-600 pr-4 text-white">إدارة المحتوى الحالي</h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...videos, ...books].map((item: any) => (
                <div key={item.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col justify-between group">
                  <div className="flex items-center gap-3 overflow-hidden mb-3">
                    <img src={item.thumbnailUrl || LOGO_URL} className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                    <span className="text-[10px] font-black text-white truncate">{item.title}</span>
                  </div>
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => {
                      if ('videoUrl' in item) {
                        setEditingVidId(item.id);
                        setNewVid({...item});
                      } else {
                        setEditingBookId(item.id);
                        setNewBook({...item});
                      }
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"><Edit3 size={14}/></button>
                    <button onClick={() => deleteDoc(doc(db, 'videoUrl' in item ? 'videos' : 'books', item.id))} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'posts' && (
        <div className="space-y-12">
           <div className="bg-black/40 backdrop-blur-3xl p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[4rem] border border-white/5 space-y-6">
              <h3 className="text-2xl font-black text-white flex items-center gap-3"><Newspaper className="text-red-600"/> {editingPostId ? "تعديل منشور" : "نشر تحديث للعمالقة"}</h3>
              <input placeholder="العنوان" value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none font-bold text-sm" />
              <textarea placeholder="المحتوى" value={newPost.content} onChange={e => setNewPost({...newPost, content: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none h-40 text-sm" />
              <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-gray-500">الصور (حتى 30 صورة)</span>
                    <button onClick={() => setNewPost({...newPost, images: []})} className="text-[9px] text-red-500 font-black uppercase underline">إعادة تعيين</button>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <p className="text-[9px] text-gray-600 uppercase font-black">رفع من الجهاز</p>
                       <input type="file" multiple accept="image/*" onChange={handlePostImages} className="w-full text-[10px] text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[9px] file:font-black file:bg-red-600 file:text-white" />
                    </div>
                    <div className="space-y-2">
                       <p className="text-[9px] text-gray-600 uppercase font-black">رابط صورة خارجي</p>
                       <div className="flex gap-2">
                          <input id="post-url-img-admin" placeholder="رابط URL" className="flex-1 bg-white/5 border border-white/10 p-2 rounded-xl text-[10px] text-white" />
                          <button onClick={() => { 
                            const input = document.getElementById('post-url-img-admin') as HTMLInputElement;
                            if(input.value) setNewPost(p => ({...p, images: [...p.images, input.value].slice(0, 30)}));
                            input.value = "";
                          }} className="bg-red-600 p-2 px-4 rounded-xl text-xs text-white shadow-lg">+</button>
                       </div>
                    </div>
                 </div>
                 <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                    {newPost.images.map((img, i) => (
                      <div key={i} className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-white/10 relative group">
                        <img src={img} className="w-full h-full object-cover" />
                        <button onClick={() => setNewPost(p => ({...p, images: p.images.filter((_, idx) => idx !== i)}))} className="absolute inset-0 bg-red-600/80 items-center justify-center hidden group-hover:flex"><X size={12}/></button>
                      </div>
                    ))}
                 </div>
              </div>
              <input placeholder={t.sourceUrl} value={newPost.sourceUrl} onChange={e => setNewPost({...newPost, sourceUrl: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none text-xs" />
              <div className="flex gap-3">
                <button onClick={savePost} className="flex-1 bg-red-600 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-red-600/20 text-white">{editingPostId ? "حفظ التعديلات" : "نشر للعمالقة"}</button>
                {editingPostId && <button onClick={() => { setEditingPostId(null); setNewPost({ title: "", content: "", images: [], sourceUrl: "" }); }} className="bg-white/10 px-6 rounded-2xl font-black text-xs uppercase text-white">إلغاء</button>}
              </div>
           </div>
           <div className="space-y-6">
              <h3 className="text-xl font-black uppercase border-r-4 border-red-600 pr-4 text-white">إدارة المنشورات السابقة</h3>
              <div className="grid gap-4">
                {posts.map(p => (
                  <div key={p.id} className="bg-white/5 border border-white/10 p-4 rounded-3xl flex items-center justify-between gap-4 group">
                    <div className="flex items-center gap-4 overflow-hidden">
                      {p.images[0] && <img src={p.images[0]} className="w-14 h-14 rounded-xl object-cover border border-white/10" />}
                      <div className="overflow-hidden">
                        <p className="font-black text-white text-sm truncate">{p.title}</p>
                        <p className="text-[9px] text-gray-500 font-black uppercase">{new Date(p.timestamp).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingPostId(p.id); setNewPost({...p}); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-3 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all"><Edit3 size={16}/></button>
                      <button onClick={() => deleteDoc(doc(db, 'posts', p.id))} className="p-3 bg-red-600/10 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      )}

      {tab === 'plans' && (
        <div className="space-y-12">
           <div className="bg-white/5 p-6 sm:p-10 rounded-[2.5rem] border border-white/10 space-y-6">
              <h3 className="text-xl font-black uppercase border-b border-white/10 pb-4 text-white">{editingPlanId ? "تعديل باقة" : "إضافة باقة جديدة"}</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <input placeholder="اسم الباقة" value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} className="bg-black/40 border border-white/10 p-4 rounded-xl text-white text-xs outline-none" />
                <input placeholder="السعر" type="number" value={newPlan.price} onChange={e => setNewPlan({...newPlan, price: Number(e.target.value)})} className="bg-black/40 border border-white/10 p-4 rounded-xl text-white text-xs outline-none" />
                <input placeholder="المدة (رقم)" type="number" value={newPlan.duration} onChange={e => setNewPlan({...newPlan, duration: Number(e.target.value)})} className="bg-black/40 border border-white/10 p-4 rounded-xl text-white text-xs outline-none" />
                <select value={newPlan.unit} onChange={e => setNewPlan({...newPlan, unit: e.target.value as any})} className="bg-black/40 border border-white/10 p-4 rounded-xl text-white text-xs">
                   <option value="minutes">دقائق</option>
                   <option value="hours">ساعات</option>
                   <option value="days">أيام</option>
                   <option value="months">أشهر</option>
                </select>
              </div>
              <input placeholder="رقم واتساب الدفع" value={newPlan.whatsapp} onChange={e => setNewPlan({...newPlan, whatsapp: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white text-xs outline-none" />
              <div className="flex gap-2">
                <button onClick={savePlan} className="flex-1 bg-red-600 p-4 rounded-xl font-black uppercase text-xs shadow-xl text-white">{editingPlanId ? "حفظ التعديلات" : "حفظ الباقة"}</button>
                {editingPlanId && <button onClick={() => { setEditingPlanId(null); setNewPlan({ name: "", price: 0, whatsapp: "", duration: 30, unit: 'days' }); }} className="bg-white/10 px-6 rounded-xl font-black text-xs uppercase text-white">إلغاء</button>}
              </div>
           </div>
           <div className="space-y-6">
              <h3 className="text-xl font-black uppercase border-r-4 border-red-600 pr-4 text-white">إدارة الباقات الحالية</h3>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map(p => (
                  <div key={p.id} className="bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col justify-between gap-4 group">
                    <div className="overflow-hidden">
                      <p className="font-black text-white text-sm truncate">{p.name}</p>
                      <p className="text-red-500 text-[9px] font-black uppercase">{p.price} {t.le} / {p.duration} {t[p.unit] || p.unit}</p>
                    </div>
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => { setEditingPlanId(p.id); setNewPlan({...p}); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"><Edit3 size={16}/></button>
                      <button onClick={() => deleteDoc(doc(db, 'subscription_plans', p.id))} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      )}

      {tab === 'seasons' && (
        <div className="space-y-12">
           <div className="glass-effect p-6 sm:p-10 rounded-[2.5rem] border border-white/10 space-y-6">
              <h3 className="text-xl font-black text-white flex items-center gap-3 border-b border-white/10 pb-4"><Layers className="text-red-600"/> {editingSeasonId ? "تعديل موسم" : "إضافة موسم جديد"}</h3>
              <input placeholder={t.seasonName} value={newSeason.title} onChange={e => setNewSeason({...newSeason, title: e.target.value})} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white text-xs outline-none" />
              <textarea placeholder={t.seasonDesc} value={newSeason.description} onChange={e => setNewSeason({...newSeason, description: e.target.value})} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl h-20 text-white text-xs outline-none" />
              <FileInput label={t.seasonCover} placeholder="رابط الصورة" value={newSeason.thumbnailUrl} onValueChange={(val) => setNewSeason({...newSeason, thumbnailUrl: val})} />
              <select value={newSeason.category} onChange={e => setNewSeason({...newSeason, category: e.target.value as any})} className="w-full bg-black border border-white/10 p-3 rounded-xl text-white text-xs">
                <option value="open">متاح للجميع</option>
                <option value="super">خاص بالنخبة</option>
              </select>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-gray-500 px-2">{t.selectVideos}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-black/40 rounded-xl border border-white/5 scrollbar-hide">
                  {videos.map(v => (
                    <div key={v.id} onClick={() => {
                      const ids = newSeason.videoIds.includes(v.id) ? newSeason.videoIds.filter(id => id !== v.id) : [...newSeason.videoIds, v.id];
                      setNewSeason({...newSeason, videoIds: ids});
                    }} className={\`p-2 rounded-lg text-[9px] font-black cursor-pointer transition-all border \${newSeason.videoIds.includes(v.id) ? 'bg-red-600 border-red-500 text-white' : 'bg-white/5 border-white/10 text-gray-500'}\`}>
                      {v.title}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveSeason} className="flex-1 bg-red-600 py-3 rounded-xl font-black uppercase text-[10px] shadow-lg shadow-red-600/20 text-white">{editingSeasonId ? "حفظ التعديلات" : "إضافة موسم"}</button>
                {editingSeasonId && <button onClick={() => { setEditingSeasonId(null); setNewSeason({ title: "", description: "", thumbnailUrl: "", category: 'open', videoIds: [] }); }} className="bg-white/10 px-4 rounded-xl text-[10px] font-black uppercase text-white">إلغاء</button>}
              </div>
           </div>
           <div className="space-y-6">
              <h3 className="text-xl font-black uppercase border-r-4 border-red-600 pr-4 text-white">إدارة المواسم الحالية</h3>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {seasons.map(s => (
                  <div key={s.id} className="bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col justify-between gap-4 group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img src={s.thumbnailUrl || LOGO_URL} className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                      <div className="overflow-hidden">
                        <p className="font-black text-white text-sm truncate">{s.title}</p>
                        <p className="text-red-500 text-[9px] font-black uppercase">{s.videoIds.length} فيديو</p>
                      </div>
                    </div>
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => { setEditingSeasonId(s.id); setNewSeason({...s}); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"><Edit3 size={16}/></button>
                      <button onClick={() => deleteDoc(doc(db, 'seasons', s.id))} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      )}
      {tab === 'settings' && (
        <div className="space-y-12">
           <div className="glass-effect p-6 sm:p-10 rounded-[2.5rem] border border-white/10 space-y-6">
              <h3 className="text-xl font-black text-white flex items-center gap-3 border-b border-white/10 pb-4"><Settings className="text-red-600"/> {t.settingsTab}</h3>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-gray-500 px-2">{t.adminNameLabel}</label>
                <input placeholder={t.adminNameLabel} value={newAdminName} onChange={e => setNewAdminName(e.target.value)} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white text-xs outline-none" />
              </div>
              <button onClick={saveSettings} className="w-full bg-red-600 py-3 rounded-xl font-black uppercase text-[10px] shadow-lg shadow-red-600/20 text-white">{t.saveSettings}</button>
              
              <div className="pt-6 border-t border-white/10 space-y-4">
                <button 
                  onClick={downloadProjectFiles} 
                  disabled={isDownloading}
                  className={cn(
                    "w-full py-4 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 transition-all text-white",
                    isDownloading ? "bg-white/10 opacity-50 cursor-not-allowed" : "bg-white/5 border border-white/10 hover:bg-white/10"
                  )}
                >
                  <Download size={18} className={cn("text-red-600", isDownloading && "animate-bounce")} />
                  {isDownloading ? "جاري التحميل..." : t.downloadProject}
                </button>
                {downloadStatus && (
                  <p className="text-center text-[10px] font-black text-red-500 animate-pulse">{downloadStatus}</p>
                )}
                
                <button 
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="w-full bg-red-600/10 border border-red-600/20 py-3 rounded-xl font-black uppercase text-[10px] text-red-500 hover:bg-red-600/20 transition-all"
                >
                  <ShieldAlert size={14} className="inline mr-2" />
                  حل مشكلة الشاشة السوداء (إعادة ضبط)
                </button>
              </div>
           </div>
        </div>
      )}

      {tab === 'code' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black uppercase text-white border-r-4 border-red-600 pr-4">خانة الكود (المصادر)</h2>
            <button onClick={fetchCode} className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all"><Reply size={16} className="rotate-180"/></button>
          </div>
          
          {loadingCode ? (
            <div className="p-20 text-center animate-pulse font-black text-xs uppercase opacity-30">جاري جلب الكود...</div>
          ) : (
            <div className="space-y-8">
              {Object.entries(sourceCode).map(([name, code]) => (
                <div key={name} className="glass-effect rounded-3xl border border-white/10 overflow-hidden">
                  <div className="bg-white/5 p-4 border-b border-white/10 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-red-500">{name}</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(code);
                        alert("تم نسخ الكود!");
                      }}
                      className="text-[9px] font-black uppercase bg-red-600/10 text-red-500 px-3 py-1 rounded-full hover:bg-red-600/20 transition-all"
                    >
                      نسخ الكود
                    </button>
                  </div>
                  <pre className="p-6 text-[10px] text-gray-400 overflow-x-auto font-mono leading-relaxed max-h-[400px]">
                    {code}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {tab === 'comments' && (
        <div className="grid gap-4">
          <h2 className="text-xl font-black uppercase text-white mb-4 border-r-4 border-red-600 pr-4">{t.commentsTab}</h2>
          {allComments.length === 0 ? (
            <div className="p-10 text-center opacity-30 font-black text-xs uppercase">لا توجد تعليقات حالياً</div>
          ) : allComments.map(c => (
            <div key={c.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <img src={c.userPhoto} className="w-10 h-10 rounded-lg object-cover" />
                <div>
                  <p className="text-white font-bold text-xs">{c.userName}: <span className="font-normal text-gray-300">{c.text}</span></p>
                  <p className="text-[8px] text-red-500 uppercase">في: {c.mediaTitle}</p>
                </div>
              </div>
              <button onClick={() => deleteDoc(doc(db, 'comments', c.id))} className="text-red-500 p-2 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={16}/></button>
            </div>
          ))}
        </div>
      )}

      {tab === 'notifs' && (
        <div className="grid gap-4">
          <h2 className="text-xl font-black uppercase text-white mb-4 border-r-4 border-red-600 pr-4">إدارة التنبيهات</h2>
          {notifications.map(n => (
            <div key={n.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex justify-between items-center gap-4">
              <div>
                <p className="text-white font-bold text-sm">{n.title}</p>
                <p className="text-gray-400 text-xs">{n.message}</p>
              </div>
              <button onClick={() => deleteDoc(doc(db, 'notifications', n.id))} className="text-red-500 p-2 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={16}/></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SearchView = () => {
  const { t, videos, books, seasons, posts, plans, searchQuery, setSearchQuery, setSelectedMedia, setView, setSelectedSeason } = useContext(AppContext);

  const filteredVideos = videos.filter(v => v.title.toLowerCase().includes(searchQuery.toLowerCase()) || v.description.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredBooks = books.filter(b => b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.description.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredSeasons = seasons.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.description.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredPosts = posts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.content.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredPlans = plans.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const hasResults = filteredVideos.length > 0 || filteredBooks.length > 0 || filteredSeasons.length > 0 || filteredPosts.length > 0 || filteredPlans.length > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-32 pt-4 px-2 animate-fade-in">
      <div className="glass-effect p-6 sm:p-10 rounded-[2.5rem] border border-white/10 space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
          <input 
            autoFocus
            placeholder={t.searchPlaceholder} 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl text-white text-sm outline-none focus:border-red-600 transition-all"
          />
        </div>
      </div>

      {searchQuery && (
        <div className="space-y-16">
          {!hasResults && (
            <div className="text-center py-20 space-y-4">
              <Search size={60} className="text-gray-700 mx-auto" />
              <p className="text-gray-500 font-black">{t.noResults}</p>
            </div>
          )}

          {filteredSeasons.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-xl font-black uppercase border-r-4 border-red-600 pr-4 text-white">{t.seasons}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredSeasons.map(s => (
                  <div key={s.id} onClick={() => { setSelectedSeason(s); setView('season-view'); }} className="group cursor-pointer space-y-3">
                    <div className="aspect-[3/4] rounded-[2rem] overflow-hidden border border-white/10 relative shadow-2xl transition-all duration-500 group-hover:scale-[1.02] group-hover:border-red-600/50">
                      <img src={s.thumbnailUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
                      <div className="absolute bottom-4 right-4 left-4">
                        <p className="text-white font-black text-xs sm:text-sm line-clamp-2 leading-tight">{s.title}</p>
                        <div className="flex items-center gap-2 mt-2">
                           <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-red-600 text-white">{s.videoIds.length} {t.videos}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredVideos.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-xl font-black uppercase border-r-4 border-red-600 pr-4 text-white">{t.freeVideos}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredVideos.map(v => (
                  <div key={v.id} onClick={() => { setSelectedMedia(v); setView('home'); window.scrollTo({top:0, behavior:'smooth'}); }} className="group cursor-pointer space-y-3">
                    <div className="aspect-video rounded-2xl overflow-hidden border border-white/10 relative shadow-2xl transition-all duration-500 group-hover:scale-[1.02] group-hover:border-red-600/50">
                      <img src={v.thumbnailUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60"></div>
                      <div className="absolute bottom-3 right-3 left-3">
                        <p className="text-white font-black text-[10px] sm:text-xs line-clamp-1">{v.title}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredBooks.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-xl font-black uppercase border-r-4 border-red-600 pr-4 text-white">{t.novels}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredBooks.map(b => (
                  <div key={b.id} onClick={() => { setSelectedMedia(b); setView('novels'); window.scrollTo({top:0, behavior:'smooth'}); }} className="group cursor-pointer space-y-3">
                    <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 relative shadow-2xl transition-all duration-500 group-hover:scale-[1.02] group-hover:border-red-600/50">
                      <img src={b.thumbnailUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80"></div>
                      <div className="absolute bottom-3 right-3 left-3">
                        <p className="text-white font-black text-[10px] sm:text-xs line-clamp-2 leading-tight">{b.title}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SeasonView = () => {
  const { t, selectedSeason, videos, setSelectedMedia, setView } = useContext(AppContext);
  if (!selectedSeason) return null;

  const seasonVideos = videos.filter(v => selectedSeason.videoIds.includes(v.id));

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-32 pt-4 px-2 animate-fade-in">
       <div className="relative h-[40vh] sm:h-[60vh] rounded-[3rem] sm:rounded-[5rem] overflow-hidden border-2 border-white/10 shadow-2xl">
          <img src={selectedSeason.thumbnailUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
          <div className="absolute bottom-10 right-10 left-10 space-y-4">
             <div className="flex items-center gap-3">
                <span className="bg-red-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase shadow-lg shadow-red-600/20">{selectedSeason.category === 'super' ? t.elite : t.free}</span>
                <span className="bg-white/10 backdrop-blur-md text-white px-4 py-1 rounded-full text-[10px] font-black uppercase border border-white/10">{seasonVideos.length} {t.videos}</span>
             </div>
             <h1 className="text-4xl sm:text-7xl font-black text-white leading-tight">{selectedSeason.title}</h1>
             <p className="text-gray-300 text-sm sm:text-lg max-w-3xl line-clamp-3 leading-relaxed">{selectedSeason.description}</p>
          </div>
       </div>

       <div className="space-y-10">
          <h3 className="text-2xl font-black uppercase border-r-4 border-red-600 pr-4 text-white">{t.videos}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
             {seasonVideos.map((v, idx) => (
               <div key={v.id} onClick={() => { setSelectedMedia(v); setView('home'); window.scrollTo({top:0, behavior:'smooth'}); }} className="group cursor-pointer space-y-4">
                  <div className="aspect-video rounded-3xl overflow-hidden border border-white/10 relative shadow-2xl transition-all duration-500 group-hover:scale-[1.05] group-hover:border-red-600/50">
                    <img src={v.thumbnailUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60"></div>
                    <div className="absolute top-3 right-3 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-black text-xs shadow-lg">{idx + 1}</div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                          <Play size={24} fill="currentColor" />
                       </div>
                    </div>
                  </div>
                  <p className="text-white font-black text-xs sm:text-sm line-clamp-2 px-2 group-hover:text-red-500 transition-colors">{v.title}</p>
               </div>
             ))}
          </div>
       </div>
    </div>
  );
};

const MediaRow = ({ list, title, setSelectedMedia, t, type = 'video' }: { list: any[], title: string, setSelectedMedia: any, t: any, type?: 'video' | 'book' | 'season' }) => {
  const { setView, setSelectedSeason } = useContext(AppContext);
  if (list.length === 0) return null;
  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in px-1">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="w-1 h-6 sm:h-8 bg-red-600 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
        <h2 className="text-sm sm:text-2xl font-black text-white uppercase tracking-tight">{title}</h2>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {list.map((item) => (
          <div key={item.id} onClick={() => {
            if (type === 'season') {
              setSelectedSeason(item);
              setView('season-view');
            } else {
              setSelectedMedia(item);
            }
          }} className="bg-black/40 backdrop-blur-3xl rounded-lg sm:rounded-2xl border border-white/5 overflow-hidden group cursor-pointer hover:border-red-600/30 transition-all shadow-xl active:scale-95">
            <div className={\`relative overflow-hidden \${type === 'video' ? 'aspect-video' : 'aspect-[3/4]'}\`}>
               <img src={item.thumbnailUrl || LOGO_URL} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-1 sm:p-3">
                  <Play className="text-white group-hover:text-red-500 transition-colors w-3 h-3 sm:w-6 sm:h-6" />
               </div>
               {type === 'season' && (
                 <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-0.5 rounded-full text-[6px] sm:text-[8px] font-black uppercase shadow-lg">
                   {item.videoIds.length} {t.videos}
                 </div>
               )}
            </div>
            <div className="p-1.5 sm:p-3">
               <h3 className="font-black text-white text-[7px] sm:text-xs line-clamp-1 group-hover:text-red-500 transition-colors">{item.title}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ForumView = () => {
  const { user, t, isAdmin } = useContext(AppContext);
  const [messages, setMessages] = useState<ForumMessage[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      setIsSubscribed(user.isSubscribed || isAdmin);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (!isSubscribed) return;
    const q = query(collection(db, 'forum_messages'), orderBy('timestamp', 'asc'), limit(100));
    return onSnapshot(q, (s) => setMessages(s.docs.map(d => ({ id: d.id, ...d.data() } as ForumMessage))));
  }, [isSubscribed]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  if (!isSubscribed) {
    return (
      <div className="max-w-4xl mx-auto mt-20 p-10 glass-effect rounded-[3rem] border border-white/10 text-center space-y-6 animate-fade-in">
        <div className="w-24 h-24 bg-red-600/20 rounded-full flex items-center justify-center mx-auto border border-red-600/30">
          <Lock size={40} className="text-red-600" />
        </div>
        <h2 className="text-3xl font-black text-white">{t.forumLocked}</h2>
        <p className="text-gray-400 text-sm leading-relaxed">{t.subscribePrompt}</p>
        <button onClick={() => window.location.href = '#plans'} className="bg-red-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs shadow-xl shadow-red-600/20 hover:scale-105 transition-all">
          {t.subscribeNow}
        </button>
      </div>
    );
  }

  const sendMessage = async () => {
    if (!text.trim() || !user || isSending) return;
    if (!user.isSubscribed && !isAdmin) { 
      alert("هذا المجلس مخصص للعمالقة المشتركين فقط. يرجى تفعيل اشتراكك للانضمام!"); 
      return; 
    }
    if (user.isMuted) { alert("لقد تم كتمك من قبل الإدارة."); return; }
    
    setIsSending(true);
    try {
      await addDoc(collection(db, 'forum_messages'), {
        userId: user.id, userName: user.name, userPhoto: user.photoUrl,
        text: text, timestamp: Date.now(), isAdmin: isAdmin,
        replyTo: replyTo ? { id: replyTo.id, userName: replyTo.userName, text: replyTo.text } : null
      });
      setText(""); setReplyTo(null);
    } catch (error) {
      console.error("Error sending message:", error);
      alert("حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsSending(false);
    }
  };

  const deleteMsg = async (id: string, authorId: string) => {
    if (isAdmin || authorId === user.id) {
       if (window.confirm("حذف هذه الرسالة؟")) await deleteDoc(doc(db, 'forum_messages', id));
    }
  };

  const editMsg = async (id: string, authorId: string, oldText: string) => {
    if (authorId !== user.id) return;
    const newText = prompt("تعديل الرسالة:", oldText);
    if (newText && newText !== oldText) {
       await updateDoc(doc(db, 'forum_messages', id), { text: newText });
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[65vh] sm:h-[70vh] flex flex-col bg-black/40 backdrop-blur-3xl rounded-[2rem] sm:rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl animate-fade-in">
      <div className="p-4 sm:p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
         <h2 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2 sm:gap-3"><MessageSquare className="text-red-600"/> {t.forum}</h2>
         {replyTo && (
           <div className="bg-red-600/10 border border-red-600/20 px-2 py-1 rounded-lg flex items-center gap-2 animate-fade-in">
              <span className="text-[8px] sm:text-[10px] text-red-500 font-black uppercase truncate max-w-[80px]">{t.replyTo}: {replyTo.userName}</span>
              <button onClick={() => setReplyTo(null)} className="text-white"><X size={10}/></button>
           </div>
         )}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 sm:space-y-6 scrollbar-hide">
         {messages.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-4">
              <MessageCircle size={40} className="animate-pulse" />
              <p className="font-black uppercase text-[10px] tracking-widest">{t.noMessages}</p>
           </div>
         ) : messages.map((m) => (
           <div key={m.id} className={\`flex gap-2 sm:gap-4 \${m.userId === user?.id ? 'flex-row-reverse' : ''} animate-fade-in\`}>
              <img src={m.userPhoto} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover border border-white/10 shrink-0" />
              <div className={\`max-w-[85%] sm:max-w-[70%] space-y-1 sm:space-y-2 \${m.userId === user?.id ? 'items-end' : ''}\`}>
                 <div className={\`flex items-center gap-2 \${m.userId === user?.id ? 'flex-row-reverse' : ''}\`}>
                    <span className="text-[8px] sm:text-[10px] font-black text-gray-500 uppercase">{m.userName}</span>
                    {m.isAdmin && <ShieldCheck size={10} className="text-red-600" />}
                 </div>
                 {m.replyTo && (
                    <div className="bg-white/5 border-r-2 border-red-600 p-2 rounded-lg text-[9px] text-gray-500 italic">
                       <span className="font-black text-red-500 block mb-1">{m.replyTo.userName}</span>
                       <p className="line-clamp-1">{m.replyTo.text}</p>
                    </div>
                 )}
                 <div className="relative group">
                   <div onClick={() => setReplyTo(m)} className={\`p-3 sm:p-4 rounded-2xl cursor-pointer hover:scale-[1.01] transition-all \${m.userId === user?.id ? 'bg-red-600 text-white rounded-tr-none shadow-lg' : 'bg-white/5 text-gray-300 rounded-tl-none border border-white/10 shadow-lg'}\`}>
                      <p className="text-xs sm:text-sm font-medium leading-relaxed break-words">{m.text}</p>
                      <p className="text-[7px] opacity-40 mt-1 font-black uppercase">{new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                   </div>
                   <div className={\`absolute top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-all \${m.userId === user?.id ? '-right-12' : '-left-12'}\`}>
                      {(isAdmin || m.userId === user?.id) && (
                        <button onClick={() => deleteMsg(m.id, m.userId)} className="p-1.5 bg-red-600/20 text-red-500 rounded-lg"><Trash2 size={12}/></button>
                      )}
                      {m.userId === user?.id && (
                        <button onClick={() => editMsg(m.id, m.userId, m.text || '')} className="p-1.5 bg-blue-600/20 text-blue-500 rounded-lg"><Edit3 size={12}/></button>
                      )}
                      <button onClick={() => setReplyTo(m)} className="p-1.5 bg-green-600/20 text-green-500 rounded-lg"><Reply size={12}/></button>
                   </div>
                 </div>
              </div>
           </div>
         ))}
      </div>
      <div className="p-3 sm:p-6 bg-black/40 border-t border-white/5">
         <div className="flex gap-2 items-center bg-white/5 p-1.5 sm:p-2 rounded-xl border border-white/10 focus-within:border-red-600 transition-colors">
            <input value={text} onChange={(e) => setText(e.target.value)} disabled={isSending} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder={t.forumPlaceholder} className="flex-1 bg-transparent border-none outline-none p-1.5 sm:p-3 text-xs sm:text-sm text-white disabled:opacity-50" />
            <button onClick={sendMessage} disabled={isSending} className="bg-red-600 p-2 sm:p-3 rounded-lg hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:scale-100">
               {isSending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Send size={16} className="text-white" />}
            </button>
         </div>
      </div>
    </div>
  );
};

const PostView = ({ post, onBack, t }: { post: Post, onBack: () => void, t: any }) => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 sm:space-y-12 animate-fade-in pb-40 px-1">
       <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-white transition-all uppercase font-black text-[10px] sm:text-xs"><ChevronLeft size={14}/> {t.back}</button>
       <div className="space-y-6 sm:space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-white/5 pb-6 sm:pb-8 gap-4 sm:gap-6">
             <div className="space-y-2 sm:space-y-3 flex-1">
                <h1 className="text-2xl sm:text-6xl font-black text-white logo-text-glow leading-tight break-words">{post.title}</h1>
                <p className="text-red-500 font-black text-[8px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em]">{post.adminName} @ {new Date(post.timestamp).toLocaleString()}</p>
             </div>
             {post.sourceUrl && (
               <button onClick={() => window.open(post.sourceUrl, '_blank')} className="bg-red-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase shadow-xl active:scale-95">
                  <ExternalLink size={14}/> {t.viewFromSource}
               </button>
             )}
          </div>
          <div className="grid gap-6 sm:gap-10">
             <p className="text-sm sm:text-xl text-gray-300 leading-relaxed text-justify break-words whitespace-pre-wrap">{post.content}</p>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {post.images && post.images.map((img, i) => (
                   <div key={i} className="rounded-2xl sm:rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl bg-black/20">
                      <img src={img} className="w-full h-auto object-cover hover:scale-105 transition-transform duration-1000" loading="lazy" />
                   </div>
                ))}
             </div>
          </div>
       </div>
    </div>
  );
};

const ExtensiveContent = ({ title, content }: { title: string, content: string }) => {
  return (
    <div className="max-w-6xl mx-auto pt-12 space-y-12 animate-fade-in px-4 pb-20">
       <div className="space-y-4 text-center">
          <h2 className="text-3xl sm:text-8xl font-black text-white logo-text-glow uppercase tracking-tighter leading-tight">{title}</h2>
          <div className="w-20 sm:w-40 h-1.5 sm:h-2 bg-red-600 mx-auto rounded-full"></div>
       </div>
       <div className="bg-black/40 backdrop-blur-3xl p-6 sm:p-20 rounded-[2rem] sm:rounded-[5rem] border border-white/5 shadow-2xl leading-loose text-xs sm:text-xl text-gray-400 space-y-8 text-justify">
          {content.split('\\n\\n').map((para, i) => <p key={i}>{para}</p>)}
       </div>
    </div>
  );
};

const SideMenu = () => {
  const { isMenuOpen, setIsMenuOpen, t, setView, user, isAdmin, isLogged, setIsLogged, setShowLogin, remainingMs } = useContext(AppContext);
  if (!isMenuOpen) return null;
  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return \`\${d}\${t.days} \${h}:\${m}:\${sec}\`;
  };

  return (
    <div className="fixed inset-0 z-[600] flex justify-start animate-fade-in">
       <div className="fixed inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsMenuOpen(false)}></div>
       <div className="relative w-[80vw] sm:w-96 h-full bg-[#050505] border-l border-white/10 shadow-2xl p-6 sm:p-10 flex flex-col animate-slide-in-right">
          <div className="flex justify-between items-center mb-10 sm:mb-16">
             <div className="flex items-center gap-3">
               <img src={LOGO_URL} referrerPolicy="no-referrer" className="w-10 h-10 sm:w-16 sm:h-16 rounded-xl border-2 border-red-600 shadow-2xl fire-glow" />
               <span className="font-black text-sm sm:text-lg tracking-tighter logo-text-glow uppercase">A4Giant</span>
             </div>
             <button onClick={() => setIsMenuOpen(false)} className="text-gray-500 hover:text-white transition-all"><X size={28}/></button>
          </div>
          <div className="space-y-3 sm:space-y-8 flex-1 overflow-y-auto scrollbar-hide">
             {isLogged && user?.isSubscribed && (
               <div className="bg-red-600/10 border border-red-600/20 p-4 rounded-2xl mb-4 text-center space-y-2">
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">{t.timeLeft}</p>
                  <p className="text-xl font-black text-white font-mono">
                    {remainingMs > 0 ? formatTime(remainingMs) : "انتهى الاشتراك - يرجى التجديد"}
                  </p>
               </div>
             )}
             {isLogged && !user?.isSubscribed && (
               <div className="bg-white/5 border border-white/10 p-4 rounded-2xl mb-4 text-center">
                  <p className="text-[10px] font-black text-gray-500 uppercase">{t.subscribePrompt}</p>
                  <button onClick={() => { setView('super-giant'); setIsMenuOpen(false); }} className="mt-2 text-red-500 font-black text-xs uppercase underline">{t.subscribeNow}</button>
               </div>
             )}
             {[
               {id: 'home', icon: Home, label: t.home},
               {id: 'posts-list', icon: Newspaper, label: t.postsTitle},
               {id: 'profile', icon: Settings, label: t.yourAccount},
               {id: 'super-giant', icon: Flame, label: t.premium},
               {id: 'novels', icon: BookOpen, label: t.novels},
               {id: 'forum', icon: MessageSquare, label: t.forum},
               {id: 'notifications', icon: Bell, label: t.notifications},
               {id: 'about-us', icon: Info, label: t.aboutUs},
               {id: 'contact-us', icon: PhoneCall, label: t.contactUs},
               {id: 'terms-conditions', icon: ShieldAlert, label: t.terms},
               {id: 'privacy-policy', icon: ShieldCheck, label: t.privacyPolicy},
             ].map(m => (
               <button key={m.id} onClick={() => { setView(m.id as any); setIsMenuOpen(false); }} className="w-full py-3 sm:py-5 px-4 sm:px-8 rounded-xl bg-white/5 flex items-center justify-between group hover:bg-red-600/10 transition-all border border-transparent hover:border-red-600/20">
                  <span className="font-black text-xs sm:text-xl text-white group-hover:text-red-500">{m.label}</span>
                  <m.icon className="text-gray-600 group-hover:text-red-500" size={18} />
               </button>
             ))}
             {!isLogged && (
               <button onClick={() => { setShowLogin(true); setIsMenuOpen(false); }} className="w-full py-4 sm:py-6 px-4 sm:px-8 rounded-xl bg-red-600 flex items-center justify-between group hover:scale-[1.02] transition-all shadow-xl">
                  <span className="font-black text-xs sm:text-xl text-white uppercase">{t.joinUs}</span>
                  <UserPlus className="text-white" size={18} />
               </button>
             )}
          </div>
          {isLogged && (
            <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
               <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 shadow-lg">
                  <img src={user?.photoUrl} className="w-10 h-10 sm:w-14 rounded-xl border-2 border-red-600 object-cover" />
                  <div className="flex-1 overflow-hidden text-right">
                    <p className="font-black text-white text-[10px] sm:text-lg truncate">{user?.name}</p>
                    <p className="text-[7px] sm:text-[10px] font-black text-red-600 uppercase mt-0.5">{isAdmin ? t.adminRank : t.userRank}</p>
                  </div>
               </div>
               <button onClick={() => { setIsLogged(false); localStorage.setItem('giant_logged', 'false'); setIsMenuOpen(false); }} className="w-full py-3 text-red-500 font-black uppercase text-[8px] sm:text-[10px] flex items-center justify-center gap-2 hover:bg-red-600/10 rounded-xl transition-all">
                  <LogOut size={16}/> {t.logout}
               </button>
            </div>
          )}
       </div>
    </div>
  );
};

const JoinPortal = ({ onClose }: { onClose: () => void }) => {
  const { t, user, plans, setIsLogged, loginWithLinkKey } = useContext(AppContext);
  const [name, setName] = useState(user?.name || "");
  const [photo, setPhoto] = useState(user?.photoUrl || LOGO_URL);
  const [planType, setPlanType] = useState("");
  const [inputKey, setInputKey] = useState("");
  const [showKeyLogin, setShowKeyLogin] = useState(false);

  const handleLogin = async () => {
    if (!name.trim()) {
      alert(t.dir === 'rtl' ? "يرجى إدخال اسمك أولاً!" : "Please enter your name first!");
      return;
    }
    if (!user?.id) return;
    
    try {
      await updateDoc(doc(db, 'users', user.id), { name, photoUrl: photo });
    } catch (e) {
      console.error("Error updating user:", e);
    }
    
    setIsLogged(true);
    localStorage.setItem('giant_logged', 'true');
    onClose();
  };

  const handleKeyLogin = async () => {
    if (!inputKey.trim()) return;
    const success = await loginWithLinkKey(inputKey.trim());
    if (success) {
      onClose();
    } else {
      alert(t.dir === 'rtl' ? "مفتاح الربط غير صحيح!" : "Invalid Link Key!");
    }
  };

  const handleRequest = async () => {
    if (!name.trim()) {
      alert(t.dir === 'rtl' ? "يرجى إدخال اسمك أولاً!" : "Please enter your name first!");
      return;
    }
    if (!planType || !user?.id) return;
    
    const plan = plans.find((p: any) => p.name === planType);
    if (!plan) return;

    let ip = "غير معروف";
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      ip = data.ip;
    } catch (e) {}

    const message = \`طلب اشتراك جديد في عالم العمالقة:
اسم العملاق: \${name}
ID العملاق: \${user.id}
IP الجهاز: \${ip}
الباقة المطلوبة: \${plan.name}
السعر: \${plan.price} \${t.le}\`;

    const whatsappUrl = \`https://wa.me/\${plan.whatsapp.replace('+', '')}?text=\${encodeURIComponent(message)}\`;

    try {
      await updateDoc(doc(db, 'users', user.id), { name, photoUrl: photo });
      await addDoc(collection(db, 'subscription_requests'), {
        userId: user.id,
        userName: name,
        planType: planType,
        ip: ip,
        timestamp: Date.now()
      });
    } catch (e) {
      console.error("Error in handleRequest:", e);
    }
    
    window.open(whatsappUrl, '_blank');
    alert("تم توجيهك للواتساب لتأكيد الاشتراك مع الإدارة!");
    setIsLogged(true);
    localStorage.setItem('giant_logged', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose}></div>
      <div className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 p-8 sm:p-12 rounded-[3rem] shadow-2xl space-y-8 animate-scale-in overflow-y-auto max-h-[90vh] scrollbar-hide">
        <button onClick={onClose} className="absolute top-6 left-6 text-gray-500 hover:text-white"><X size={24}/></button>
        <div className="text-center space-y-4">
           <img src={LOGO_URL} referrerPolicy="no-referrer" className="w-20 h-20 mx-auto rounded-2xl border-2 border-red-600 fire-glow" />
           <h2 className="text-3xl font-black text-white logo-text-glow uppercase">{t.loginTitle}</h2>
        </div>
        <div className="space-y-6">
           <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
              <button onClick={() => setShowKeyLogin(false)} className={\`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all \${!showKeyLogin ? 'bg-red-600 text-white' : 'text-gray-500'}\`}>{t.joinUs}</button>
              <button onClick={() => setShowKeyLogin(true)} className={\`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all \${showKeyLogin ? 'bg-red-600 text-white' : 'text-gray-500'}\`}>{t.keyLogin}</button>
           </div>

           {!showKeyLogin ? (
             <>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase px-2">{t.yourName}</label>
                  <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-red-600 transition-all font-bold" />
               </div>
               <FileInput label={t.uploadImg} value={photo} onValueChange={setPhoto} placeholder="URL" />
               
               <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-2 text-red-600">
                     <ShieldAlert size={16}/>
                     <span className="text-[10px] font-black uppercase tracking-widest">{t.subscribeNow}</span>
                  </div>
                  <div className="grid gap-2">
                     {plans.map((p: any) => (
                        <button key={p.id} onClick={() => setPlanType(p.name)} className={\`p-4 rounded-xl border flex justify-between items-center transition-all \${planType === p.name ? 'bg-red-600 border-red-500 text-white' : 'bg-white/5 border-white/10 text-gray-400'}\`}>
                           <span className="font-black text-xs">{p.name}</span>
                           <span className="text-[10px] font-bold opacity-60">{p.price} {t.le}</span>
                        </button>
                     ))}
                  </div>
               </div>

               <div className="flex flex-col gap-3 pt-6">
                  <button onClick={planType ? handleRequest : handleLogin} className="w-full bg-red-600 py-5 rounded-[2rem] font-black text-white uppercase tracking-widest shadow-2xl shadow-red-600/20 active:scale-95 transition-all">
                     {planType ? t.subscribeNow : t.enterWorld}
                  </button>
               </div>
             </>
           ) : (
             <div className="space-y-6 py-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-500 uppercase px-2">{t.linkKey}</label>
                   <input value={inputKey} onChange={e => setInputKey(e.target.value)} placeholder={t.enterKey} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-red-600 transition-all font-bold text-center tracking-widest" />
                </div>
                <button onClick={handleKeyLogin} className="w-full bg-red-600 py-5 rounded-[2rem] font-black text-white uppercase tracking-widest shadow-2xl shadow-red-600/20 active:scale-95 transition-all">
                   {t.loginWithKey}
                </button>
             </div>
           )}

           <div className="flex flex-col gap-3">
              <button onClick={() => window.open('https://wa.me/', '_blank')} className="w-full py-4 text-gray-500 font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:text-white transition-all">
                 <PhoneCall size={14}/> {t.contactUs}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

const CommentsSection = ({ mediaId, mediaTitle }: { mediaId: string, mediaTitle: string }) => {
  const { t, user, isAdmin } = useContext(AppContext);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'comments'), where('mediaId', '==', mediaId));
    return onSnapshot(q, (s) => {
      const fetched = s.docs.map(d => ({ id: d.id, ...d.data() } as Comment));
      setComments(fetched.sort((a, b) => b.timestamp - a.timestamp));
    });
  }, [mediaId]);

  const addComment = async () => {
    if (!text.trim() || !user || isSending) return;
    setIsSending(true);
    try {
      await addDoc(collection(db, 'comments'), {
        mediaId, mediaTitle, userId: user.id, userName: user.name, userPhoto: user.photoUrl,
        text, timestamp: Date.now()
      });
      setText("");
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("حدث خطأ أثناء إضافة التعليق.");
    } finally {
      setIsSending(false);
    }
  };

  const deleteComment = async (id: string) => {
    if (window.confirm("حذف التعليق؟")) await deleteDoc(doc(db, 'comments', id));
  };

  const replyComment = async (id: string) => {
    const r = prompt("اكتب الرد:");
    if (r) await updateDoc(doc(db, 'comments', id), { replyText: r });
  };

  return (
    <div className="space-y-10 sm:space-y-16 animate-fade-in">
       <div className="flex items-center gap-4">
          <div className="w-1.5 h-10 bg-red-600 rounded-full"></div>
          <h3 className="text-xl sm:text-4xl font-black text-white uppercase">{t.comments}</h3>
       </div>
       <div className="bg-white/[0.02] p-4 sm:p-12 rounded-[2rem] sm:rounded-[4rem] border border-white/5 space-y-8">
          {!user ? (
            <div className="p-4 bg-red-600/10 border border-red-600/20 rounded-2xl text-center">
               <p className="text-red-500 font-black uppercase text-[10px]">{t.loginPrompt}</p>
            </div>
          ) : (
            <div className="flex gap-4 items-center bg-black/40 p-2 sm:p-4 rounded-2xl border border-white/10 focus-within:border-red-600 transition-all">
               <input value={text} onChange={e => setText(e.target.value)} disabled={isSending} placeholder={t.writeComment} className="flex-1 bg-transparent border-none outline-none text-xs sm:text-lg text-white disabled:opacity-50" />
               <button onClick={addComment} disabled={isSending} className="bg-red-600 p-2 sm:p-4 rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:scale-100">
                  {isSending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Send size={18} className="text-white"/>}
               </button>
            </div>
          )}
          <div className="space-y-6 sm:space-y-10">
             {comments.length === 0 ? (
                <p className="text-center text-gray-600 font-black uppercase text-[10px]">كن أول من يعلق كعملاق</p>
             ) : comments.map(c => (
                <div key={c.id} className="space-y-4 group animate-fade-in border-r border-white/5 pr-4">
                   <div className="flex justify-between items-start">
                      <div className="flex gap-4 items-center">
                         <img src={c.userPhoto} className="w-10 h-10 sm:w-16 sm:h-16 rounded-xl border border-white/10 object-cover" />
                         <div>
                            <h4 className="font-black text-white text-xs sm:text-xl">{c.userName}</h4>
                            <p className="text-[7px] sm:text-[10px] text-gray-600 font-black uppercase">{new Date(c.timestamp).toLocaleDateString()}</p>
                         </div>
                      </div>
                      {(isAdmin || c.userId === user?.id) && (
                        <div className="flex gap-2">
                           {isAdmin && <button onClick={() => replyComment(c.id)} className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg"><Reply size={16}/></button>}
                           <button onClick={() => deleteComment(c.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 size={16}/></button>
                        </div>
                      )}
                   </div>
                   <p className="text-gray-300 text-xs sm:text-lg leading-relaxed">{c.text}</p>
                   {c.replyText && (
                      <div className="bg-red-600/5 border-r-4 border-red-600 p-4 sm:p-8 rounded-2xl mr-4 sm:mr-12 space-y-2">
                         <p className="text-[8px] sm:text-xs font-black text-red-600 uppercase flex items-center gap-2"><ShieldCheck size={12}/> {t.adminRank}</p>
                         <p className="text-white text-xs sm:text-lg italic">"{c.replyText}"</p>
                      </div>
                   )}
                </div>
             ))}
          </div>
       </div>
    </div>
  );
};

const SelectedMedia = () => {
  const { t, selectedMedia, setSelectedMedia, user, isAdmin, setView } = useContext(AppContext);
  if (!selectedMedia) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-3xl overflow-y-auto animate-fade-in scrollbar-hide">
      <div className="max-w-7xl mx-auto min-h-screen p-3 sm:p-20 relative">
        <button onClick={() => setSelectedMedia(null)} className="fixed top-4 left-4 sm:top-16 sm:left-16 bg-black/60 p-2.5 sm:p-6 rounded-full border border-white/10 text-white z-[1010] hover:bg-red-600 transition-all shadow-2xl active:scale-90"><X size={20}/></button>
        <div className="space-y-8 sm:space-y-16">
           {selectedMedia.category === 'super' && !user?.isSubscribed && !isAdmin ? (
             <div className="w-full h-[60vh] flex flex-col items-center justify-center bg-black/60 backdrop-blur-3xl rounded-[4rem] border-2 border-dashed border-red-600/30 space-y-6 p-10 text-center">
                <Lock size={80} className="text-red-600 animate-bounce" />
                <h2 className="text-3xl sm:text-5xl font-black text-white uppercase">{t.loginPrompt}</h2>
                <p className="text-gray-400 max-w-md">{t.subscribePrompt}</p>
                <button onClick={() => { setSelectedMedia(null); setView('super-giant'); }} className="bg-red-600 px-10 py-4 rounded-2xl font-black text-white uppercase shadow-2xl shadow-red-600/40 hover:scale-105 transition-all">
                   {t.subscribeNow}
                </button>
             </div>
           ) : (
             <div className="w-full h-[45vh] sm:h-[80vh] rounded-2xl sm:rounded-[4rem] overflow-hidden border-2 border-red-600/30 shadow-[0_0_50px_rgba(239,68,68,0.2)] bg-black relative group mt-10 sm:mt-0">
                { (selectedMedia.videoUrl || selectedMedia.bookUrl)?.startsWith('data:video') || (selectedMedia.videoUrl || selectedMedia.bookUrl)?.match(/\\.(mp4|webm|ogg)$/i) ? (
                    <video src={selectedMedia.videoUrl || selectedMedia.bookUrl} controls className="w-full h-full object-contain" />
                ) : (
                    <iframe src={formatEmbedUrl(selectedMedia.videoUrl || selectedMedia.bookUrl)} className="w-full h-full border-none" allowFullScreen loading="lazy" title={selectedMedia.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"></iframe>
                )}
             </div>
           )}
           <div className="bg-white/[0.02] backdrop-blur-3xl p-5 sm:p-16 rounded-[1.5rem] sm:rounded-[5rem] border border-white/5 space-y-6 sm:space-y-10 shadow-2xl">
              <div className="flex flex-col lg:flex-row justify-between items-start gap-4 sm:gap-8">
                 <div className="space-y-2 sm:space-y-3 flex-1 text-right">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                       <h2 className="text-xl sm:text-7xl font-black text-white logo-text-glow leading-tight break-words">{selectedMedia.title}</h2>
                       <span className="bg-red-600/10 border border-red-600 text-red-600 px-2 py-0.5 rounded-full text-[7px] sm:text-xs font-black uppercase tracking-[0.1em] shadow-lg shrink-0">{selectedMedia.category === 'super' ? t.elite : t.free}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                       {selectedMedia.allowDownload && (
                         <button onClick={() => window.open(selectedMedia.videoUrl || selectedMedia.bookUrl, '_blank')} className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] border border-white/10 transition-all flex items-center justify-center gap-2">
                           <Download size={16} /> {t.download}
                         </button>
                       )}
                       <button onClick={() => {
                         navigator.clipboard.writeText(window.location.href);
                         alert(t.keyCopied);
                       }} className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-red-600/20 hover:scale-105 transition-all flex items-center justify-center gap-2">
                         <Share2 size={16} /> {t.share}
                       </button>
                       {selectedMedia.sourceUrl && (
                         <button onClick={() => window.open(selectedMedia.sourceUrl, '_blank')} className="bg-white/5 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] border border-white/10 transition-all flex items-center justify-center gap-2">
                            <ExternalLink size={16}/> {t.viewFromSource}
                         </button>
                       )}
                    </div>
                 </div>
              </div>
              <div className="space-y-4 sm:space-y-6 text-right">
                 <p className="text-gray-300 leading-relaxed text-[11px] sm:text-2xl font-medium max-w-6xl break-words text-justify">{selectedMedia.description}</p>
              </div>
           </div>
           <CommentsSection mediaId={selectedMedia.id} mediaTitle={selectedMedia.title} />
        </div>
      </div>
    </div>
  );
};

const AppContent = () => {
  const context = useContext(AppContext);
  const { t, currentView, loading, selectedMedia, setSelectedMedia, user, isAdmin, setView, videos, books, plans, notifications, isLogged, setShowLogin, showLogin, language, setLanguage, posts, isMenuOpen, setIsMenuOpen, remainingMs, cookieAccepted, setCookieAccepted, seasons } = context;
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-black">
       <div className="relative">
          <img src={LOGO_URL} referrerPolicy="no-referrer" className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-red-600 animate-pulse fire-glow" />
          <div className="absolute inset-0 border-8 border-transparent border-t-red-600 rounded-full animate-spin"></div>
       </div>
       <h1 className="mt-8 text-2xl sm:text-4xl font-black text-red-600 uppercase tracking-widest logo-text-glow animate-bounce">Anime4Giant</h1>
    </div>
  );

  return (
    <div className="min-h-screen selection:bg-red-600 no-select pb-32 overflow-x-hidden bg-[#050505]" dir={t.dir}>
      <header className="fixed top-0 left-0 right-0 z-[400] px-3 sm:px-12 py-3 flex items-center justify-between bg-black/70 backdrop-blur-3xl border-b border-white/5">
        <div className="flex items-center gap-2 sm:gap-3">
           <img src={user?.photoUrl || LOGO_URL} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg border border-white/10 cursor-pointer" onClick={() => setIsMenuOpen(true)} />
           <button onClick={() => setView('profile')} className={\`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center \${currentView === 'profile' ? 'text-red-600 bg-red-600/10' : 'bg-white/5 text-gray-400'}\`}>
              <UserCircle size={20} />
           </button>
           <button onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')} className="bg-white/5 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-[8px] font-black text-gray-400">AR/EN</button>
           {isAdmin && <button onClick={() => setView('admin')} className={\`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center \${currentView === 'admin' ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-400'}\`}><Settings size={16}/></button>}
           {!isLogged && (
             <button onClick={() => setShowLogin(true)} className="bg-red-600 px-3 py-1.5 rounded-lg flex items-center gap-1 font-black text-[8px] sm:text-xs uppercase hover:scale-105 active:scale-95 transition-all shadow-xl shadow-red-600/30 text-white">
                <UserPlus size={12}/> <span className="hidden xs:inline">{t.joinUs}</span>
             </button>
           )}
           <button onClick={() => setView('notifications')} className={\`bg-white/5 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center \${currentView === 'notifications' ? 'text-red-600' : 'text-gray-400'}\`}>
              <Bell size={16} />
           </button>
           <button onClick={() => setView('search')} className={\`bg-white/5 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center \${currentView === 'search' ? 'text-red-600' : 'text-gray-400'}\`}>
              <Search size={16} />
           </button>
        </div>
        <div className="flex-1 flex justify-center px-1">
           <h1 className="text-sm sm:text-4xl font-black logo-text-glow uppercase tracking-tighter text-white truncate max-w-[100px] sm:max-w-none">{t.siteName}</h1>
        </div>
        <div className="flex items-center">
           <img src={LOGO_URL} referrerPolicy="no-referrer" className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg border-2 border-red-600 shadow-2xl fire-glow" />
        </div>
      </header>

      <SideMenu />

      <main className="pt-20 sm:pt-24 px-3 sm:px-8 max-w-screen-2xl mx-auto space-y-10 sm:space-y-16 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView + (selectedMedia?.id || '') + (selectedPost?.id || '')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {currentView === 'home' && (
              <div className="space-y-10">
                {selectedMedia ? (
                  <SelectedMedia />
                ) : (
                  <>
                    {posts.length > 0 && (
                      <div className="relative h-56 sm:h-[32rem] rounded-2xl sm:rounded-[4rem] overflow-hidden shadow-2xl border border-white/5 cursor-pointer active:scale-[0.98] transition-all" onClick={() => { setSelectedPost(posts[0]); setView('post-view'); }}>
                        <img src={posts[0].images[0] || LOGO_URL} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-4 sm:p-12">
                            <span className="bg-red-600 w-fit px-2 py-0.5 rounded-full text-[7px] sm:text-[10px] font-black uppercase mb-1 sm:mb-4 tracking-widest text-white shadow-lg">أحدث حصريات العمالقة</span>
                            <h2 className="text-base sm:text-6xl font-black text-white logo-text-glow leading-tight line-clamp-2">{posts[0].title}</h2>
                        </div>
                      </div>
                    )}
                    <div className="space-y-12 sm:space-y-24">
                      <MediaRow list={seasons} title={t.seasons} setSelectedMedia={setSelectedMedia} t={t} type="season" />
                      <MediaRow list={videos.filter(v => v.category === 'super' && !seasons.some(s => s.videoIds.includes(v.id)))} title={t.superGiant} setSelectedMedia={setSelectedMedia} t={t} />
                      <MediaRow list={videos.filter(v => v.category === 'open' && !seasons.some(s => s.videoIds.includes(v.id)))} title={t.freeVideos} setSelectedMedia={setSelectedMedia} t={t} />
                    </div>
                  </>
                )}
              </div>
            )}

            {currentView === 'post-view' && selectedPost && (
               <PostView post={selectedPost} onBack={() => setView('home')} t={t} />
            )}

            {currentView === 'posts-list' && (
               <div className="max-w-5xl mx-auto space-y-10 sm:space-y-16 pb-20">
                  <div className="flex items-center gap-3 sm:gap-6 px-1">
                     <div className="w-1.5 sm:w-4 h-10 sm:h-20 bg-red-600 rounded-full"></div>
                     <h2 className="text-xl sm:text-7xl font-black text-white uppercase tracking-tighter logo-text-glow leading-none">{t.postsTitle}</h2>
                  </div>
                  <div className="grid gap-6 sm:gap-16">
                     {posts.length === 0 ? (
                        <div className="py-20 text-center text-gray-600 font-black uppercase text-xs">لا توجد منشورات للعمالقة بعد</div>
                     ) : posts.map(p => (
                       <div key={p.id} onClick={() => { setSelectedPost(p); setView('post-view'); }} className="bg-black/40 border border-white/5 rounded-2xl sm:rounded-[4rem] overflow-hidden shadow-2xl active:scale-[0.98] transition-all">
                          {p.images && p.images[0] && <img src={p.images[0]} className="w-full h-40 sm:h-96 object-cover" />}
                          <div className="p-4 sm:p-12 space-y-2 sm:space-y-6">
                             <div className="flex justify-between items-center text-[7px] sm:text-xs text-gray-500 font-black uppercase">
                                <span><Calendar size={10} className="inline mr-1 text-red-600"/> {new Date(p.timestamp).toLocaleDateString()}</span>
                                <span className="bg-red-600/10 text-red-600 px-2 py-0.5 rounded-full">{p.adminName}</span>
                             </div>
                             <h3 className="text-base sm:text-4xl font-black text-white leading-tight line-clamp-2">{p.title}</h3>
                             <p className="text-gray-400 text-[10px] sm:text-xl line-clamp-3 text-justify">{p.content}</p>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            )}

            {currentView === 'novels' && (
               <div className="space-y-12 sm:space-y-24">
                  {selectedMedia ? (
                    <SelectedMedia />
                  ) : (
                    <>
                      <MediaRow list={books.filter(b => b.category === 'super')} title={t.superNovels} setSelectedMedia={setSelectedMedia} t={t} type="book" />
                      <MediaRow list={books.filter(b => b.category === 'open')} title={t.freeNovels} setSelectedMedia={setSelectedMedia} t={t} type="book" />
                    </>
                  )}
               </div>
            )}

            {currentView === 'search' && <SearchView />}
            {currentView === 'season-view' && <SeasonView />}
            {currentView === 'forum' && <ForumView />}
            {currentView === 'profile' && <YourAccount />}
            {currentView === 'super-giant' && (
              <div className="max-w-4xl mx-auto space-y-10 pb-20 px-2">
                 <div className="text-center space-y-4">
                    <h2 className="text-2xl sm:text-5xl font-black text-white logo-text-glow">{t.premium}</h2>
                    <p className="text-gray-500 text-[10px] sm:text-sm font-black uppercase tracking-widest">{t.subscribePrompt}</p>
                 </div>
                 <div className="grid gap-4">
                    {plans.map(p => (
                      <button key={p.id} onClick={() => setShowLogin(true)} className="flex justify-between items-center p-4 sm:p-8 bg-white/5 border border-white/10 rounded-2xl sm:rounded-[3rem] hover:border-red-600/50 transition-all text-right shadow-2xl">
                         <div>
                            <h4 className="font-black text-base sm:text-3xl text-white">{p.name}</h4>
                            <p className="text-[8px] sm:text-xs text-gray-500 font-black uppercase mt-1">{p.duration} {t[p.unit] || p.unit}</p>
                         </div>
                         <div className="text-left">
                            <p className="text-xl sm:text-4xl font-black text-red-600">{p.price} <span className="text-[10px] uppercase">{t.le}</span></p>
                         </div>
                      </button>
                    ))}
                 </div>
              </div>
            )}
            {currentView === 'admin' && <AdminPanel />}
            {currentView === 'about-us' && <ExtensiveContent title={t.aboutUs} content={t.dir === 'rtl' ? "نحن منصة عملاق4الانيمي، نسعى لتوفير أفضل تجربة لمشاهدة الانيمي وقراءة الروايات الحصرية. فريقنا يعمل بجد لتوفير محتوى عالي الجودة يليق بجمهورنا العربي." : "We are Anime4Giant, dedicated to providing the best experience for watching anime and reading exclusive novels. Our team works hard to provide high-quality content for our audience."} />}
            {currentView === 'contact-us' && <ExtensiveContent title={t.contactUs} content={t.dir === 'rtl' ? "يمكنكم التواصل معنا عبر الواتساب أو البريد الإلكتروني لأي استفسارات أو دعم فني. نحن هنا لخدمتكم على مدار الساعة.\\n\\nواتساب: +20123456789\\nالبريد الإلكتروني: support@anime4giant.com" : "You can contact us via WhatsApp or email for any inquiries or technical support. We are here to serve you 24/7.\\n\\nWhatsApp: +20123456789\\nEmail: support@anime4giant.com"} />}
            {currentView === 'terms-conditions' && <ExtensiveContent title={t.terms} content={t.dir === 'rtl' ? "باستخدامك لموقعنا، فإنك توافق على شروط الاستخدام الخاصة بنا. يمنع استخدام المحتوى لأغراض تجارية دون إذن مسبق. نحن نحتفظ بالحق في تعديل هذه الشروط في أي وقت." : "By using our site, you agree to our terms of use. It is prohibited to use the content for commercial purposes without prior permission. We reserve the right to modify these terms at any time."} />}
            {currentView === 'privacy-policy' && <ExtensiveContent title={t.privacyPolicy} content={t.dir === 'rtl' ? "نحن نحترم خصوصيتكم ونلتزم بحماية بياناتكم الشخصية. نستخدم ملفات تعريف الارتباط لتحسين تجربة المستخدم فقط. لا نقوم بمشاركة بياناتكم مع أي طرف ثالث." : "We respect your privacy and are committed to protecting your personal data. We use cookies to improve the user experience only. We do not share your data with any third party."} />}
            {currentView === 'notifications' && (
               <div className="max-w-4xl mx-auto space-y-8 pb-20 px-2">
                  <h2 className="text-xl font-black border-r-8 border-red-600 pr-4 uppercase text-white">{t.notifications}</h2>
                  <div className="grid gap-4 sm:gap-6">
                    {notifications.map(n => (
                       <div key={n.id} className="glass-effect p-4 sm:p-8 rounded-2xl sm:rounded-[3rem] border border-white/5 flex gap-4 sm:gap-8 shadow-2xl items-start">
                          <div className="flex-1 space-y-1 sm:space-y-3">
                             <h3 className="font-black text-sm sm:text-xl text-white">{n.title}</h3>
                             <p className="text-gray-400 text-[10px] sm:text-base leading-relaxed">{n.message}</p>
                             <p className="text-[7px] text-gray-600 font-black uppercase">{new Date(n.timestamp).toLocaleDateString()}</p>
                          </div>
                          {isAdmin && <button onClick={() => deleteDoc(doc(db, 'notifications', n.id))} className="text-red-500 p-1"><Trash2 size={14}/></button>}
                       </div>
                    ))}
                  </div>
               </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-[400] bg-black/70 backdrop-blur-3xl border-t border-white/5 px-1 sm:px-6 pb-6 pt-3 flex justify-around items-center shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        {[
          { id: 'home', icon: Home, label: t.home },
          { id: 'posts-list', icon: Newspaper, label: t.postsTitle },
          { id: 'super-giant', icon: Flame, label: t.premium },
          { id: 'profile', icon: UserCircle, label: t.yourAccount },
          { id: 'novels', icon: BookOpen, label: t.novels },
          { id: 'forum', icon: MessageSquare, label: t.forum },
          { id: 'notifications', icon: Bell, label: t.notifications }
        ].map(item => (
          <button key={item.id} onClick={() => setView(item.id as any)} className={\`flex flex-col items-center gap-1 transition-all duration-300 active:scale-90 \${currentView === item.id || (item.id === 'home' && currentView === 'post-view') || (item.id === 'posts-list' && currentView === 'post-view') ? 'text-red-600 scale-110' : 'text-gray-500 hover:text-white'}\`}>
            <item.icon size={currentView === item.id ? 22 : 16} fill={currentView === item.id || (item.id === 'home' && currentView === 'post-view') || (item.id === 'posts-list' && currentView === 'post-view') ? "currentColor" : "none"} />
            <span className={\`text-[5px] sm:text-[9px] font-black uppercase tracking-wider transition-all \${currentView === item.id ? 'opacity-100' : 'opacity-60'}\`}>{item.label}</span>
          </button>
        ))}
      </nav>

      {showLogin && <JoinPortal onClose={() => setShowLogin(false)} />}

      {!cookieAccepted && (
        <div className="fixed bottom-24 left-4 right-4 z-[500] bg-black/90 backdrop-blur-3xl border border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
           <p className="text-[10px] sm:text-xs text-gray-400 text-center sm:text-right">{t.cookieConsent}</p>
           <button onClick={() => { setCookieAccepted(true); localStorage.setItem('cookie_accepted', 'true'); }} className="bg-red-600 px-6 py-2 rounded-xl font-black text-white text-[10px] uppercase shadow-lg">
              {t.accept}
           </button>
        </div>
      )}

      {selectedMedia && <SelectedMedia />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}`;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBQUEsZUFBZTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEiLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIkFwcC50c3giXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGRlZmF1bHQgXCJpbXBvcnQgUmVhY3QsIHsgdXNlU3RhdGUsIHVzZUVmZmVjdCwgY3JlYXRlQ29udGV4dCwgdXNlQ29udGV4dCwgdXNlUmVmLCB1c2VNZW1vIH0gZnJvbSAncmVhY3QnO1xcbmltcG9ydCB7IFxcbiAgY29sbGVjdGlvbiwgb25TbmFwc2hvdCwgcXVlcnksIG9yZGVyQnksIGFkZERvYywgZG9jLCBcXG4gIGRlbGV0ZURvYywgdXBkYXRlRG9jLCBsaW1pdCwgc2V0RG9jLCB3aGVyZSwgZ2V0RG9jc1xcbn0gZnJvbSAnZmlyZWJhc2UvZmlyZXN0b3JlJztcXG5pbXBvcnQgeyBkYiB9IGZyb20gJy4vZmlyZWJhc2UnO1xcbmltcG9ydCBKU1ppcCBmcm9tICdqc3ppcCc7XFxuaW1wb3J0IHsgc2F2ZUFzIH0gZnJvbSAnZmlsZS1zYXZlcic7XFxuaW1wb3J0IHsgbW90aW9uLCBBbmltYXRlUHJlc2VuY2UgfSBmcm9tICdmcmFtZXItbW90aW9uJztcXG5pbXBvcnQgeyBjbHN4LCB0eXBlIENsYXNzVmFsdWUgfSBmcm9tICdjbHN4JztcXG5pbXBvcnQgeyB0d01lcmdlIH0gZnJvbSAndGFpbHdpbmQtbWVyZ2UnO1xcbmltcG9ydCB7IFxcbiAgVmlkZW8sIEJvb2ssIENhdGVnb3J5LCBTdWJzY3JpcHRpb25QbGFuLCBWaWV3LCBGb3J1bU1lc3NhZ2UsIFxcbiAgQXBwTm90aWZpY2F0aW9uLCBDb21tZW50LCBQb3N0LCBEdXJhdGlvblVuaXQsIFNlYXNvbiwgdHJhbnNsYXRpb25zIFxcbn0gZnJvbSAnLi90eXBlcyc7XFxuaW1wb3J0IHsgXFxuICBIb21lLCBGbGFtZSwgTWVzc2FnZVNxdWFyZSwgTG9jaywgU2V0dGluZ3MsIFRyYXNoMiwgWCwgU2VuZCwgQm9va09wZW4sIFxcbiAgQ2hldnJvbkxlZnQsIEJlbGwsIFNoaWVsZENoZWNrLCBQbGF5LCBQaG9uZUNhbGwsIEluZm8sIEdsb2JlMiwgU2hpZWxkQWxlcnQsIE1lc3NhZ2VDaXJjbGUsIEV4dGVybmFsTGluaywgVXNlclBsdXMsIENhbGVuZGFyLCBFZGl0MywgTmV3c3BhcGVyLCBSZXBseSwgTG9nT3V0LCBIYXJkRHJpdmUsIENhbWVyYSxcXG4gIFZpZGVvIGFzIFZpZGVvSWNvbiwgVXNlckNpcmNsZSwgU2VhcmNoLCBEb3dubG9hZCwgU2hhcmUyLCBMYXllcnNcXG59IGZyb20gJ2x1Y2lkZS1yZWFjdCc7XFxuXFxuLy8gU2FmZXR5IGNoZWNrIGZvciBwcm9jZXNzLmVudlxcbmlmICh0eXBlb2YgcHJvY2VzcyA9PT0gJ3VuZGVmaW5lZCcpIHtcXG4gICh3aW5kb3cgYXMgYW55KS5wcm9jZXNzID0geyBlbnY6IHt9IH07XFxufVxcblxcbmNvbnN0IExPR09fVVJMID0gXFxcImh0dHBzOi8vaW1hZ2VzLnVuc3BsYXNoLmNvbS9waG90by0xNTc4NjMyMjkyMzM1LWRmM2FiYmIwZDU4Nj9hdXRvPWZvcm1hdCZmaXQ9Y3JvcCZxPTgwJnc9NDAwXFxcIjsgXFxuXFxuY29uc3QgZm9ybWF0RW1iZWRVcmwgPSAodXJsOiBzdHJpbmcpID0+IHtcXG4gIGlmICghdXJsKSByZXR1cm4gJyc7XFxuICBpZiAodXJsLnN0YXJ0c1dpdGgoJ2RhdGE6JykpIHJldHVybiB1cmw7XFxuICBcXG4gIHRyeSB7XFxuICAgIC8vIElmIGl0J3MgYWxyZWFkeSBhbiBlbWJlZCBVUkwsIHJldHVybiBpdFxcbiAgICBpZiAodXJsLmluY2x1ZGVzKCcvZW1iZWQvJykgfHwgdXJsLmluY2x1ZGVzKCcvcHJldmlldycpIHx8IHVybC5pbmNsdWRlcygncGxheWVyLicpIHx8IHVybC5pbmNsdWRlcygndmlkZW9lbWJlZCcpKSByZXR1cm4gdXJsO1xcblxcbiAgICBjb25zdCB1cmkgPSBuZXcgVVJMKHVybCk7XFxuICAgIFxcbiAgICAvLyBZb3VUdWJlXFxuICAgIGlmICh1cmkuaG9zdG5hbWUuaW5jbHVkZXMoJ3lvdXR1YmUuY29tJykgfHwgdXJpLmhvc3RuYW1lLmluY2x1ZGVzKCd5b3V0dS5iZScpKSB7XFxuICAgICAgbGV0IHZpZGVvSWQgPSAnJztcXG4gICAgICBpZiAodXJpLnBhdGhuYW1lLmluY2x1ZGVzKCcvc2hvcnRzLycpKSB7XFxuICAgICAgICB2aWRlb0lkID0gdXJpLnBhdGhuYW1lLnNwbGl0KCcvc2hvcnRzLycpWzFdLnNwbGl0KCcvJylbMF0uc3BsaXQoJz8nKVswXTtcXG4gICAgICB9IGVsc2UgaWYgKHVyaS5zZWFyY2hQYXJhbXMuaGFzKCd2JykpIHtcXG4gICAgICAgIHZpZGVvSWQgPSB1cmkuc2VhcmNoUGFyYW1zLmdldCgndicpITtcXG4gICAgICB9IGVsc2UgaWYgKHVyaS5ob3N0bmFtZS5pbmNsdWRlcygneW91dHUuYmUnKSkge1xcbiAgICAgICAgdmlkZW9JZCA9IHVyaS5wYXRobmFtZS5zcGxpdCgnLycpWzFdO1xcbiAgICAgIH1cXG4gICAgICBpZiAodmlkZW9JZCkgcmV0dXJuIGBodHRwczovL3d3dy55b3V0dWJlLmNvbS9lbWJlZC8ke3ZpZGVvSWR9P2F1dG9wbGF5PTAmcmVsPTAmbW9kZXN0YnJhbmRpbmc9MSZlbmFibGVqc2FwaT0xJm9yaWdpbj0ke3dpbmRvdy5sb2NhdGlvbi5vcmlnaW59YDtcXG4gICAgfVxcbiAgICBcXG4gICAgLy8gRmFjZWJvb2tcXG4gICAgaWYgKHVyaS5ob3N0bmFtZS5pbmNsdWRlcygnZmFjZWJvb2suY29tJykpIHtcXG4gICAgICByZXR1cm4gYGh0dHBzOi8vd3d3LmZhY2Vib29rLmNvbS9wbHVnaW5zL3ZpZGVvLnBocD9ocmVmPSR7ZW5jb2RlVVJJQ29tcG9uZW50KHVybCl9JnNob3dfdGV4dD0wJndpZHRoPTU2MGA7XFxuICAgIH1cXG4gICAgXFxuICAgIC8vIFRpa1Rva1xcbiAgICBpZiAodXJpLmhvc3RuYW1lLmluY2x1ZGVzKCd0aWt0b2suY29tJykpIHtcXG4gICAgICBjb25zdCBwYXJ0cyA9IHVyaS5wYXRobmFtZS5zcGxpdCgnLycpO1xcbiAgICAgIGNvbnN0IHZpZGVvSWQgPSBwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXSB8fCBwYXJ0c1twYXJ0cy5sZW5ndGggLSAyXTtcXG4gICAgICBpZiAodmlkZW9JZCAmJiAhaXNOYU4oTnVtYmVyKHZpZGVvSWQpKSkge1xcbiAgICAgICAgcmV0dXJuIGBodHRwczovL3d3dy50aWt0b2suY29tL2VtYmVkL3YyLyR7dmlkZW9JZH1gO1xcbiAgICAgIH1cXG4gICAgfVxcbiAgICBcXG4gICAgLy8gSW5zdGFncmFtXFxuICAgIGlmICh1cmkuaG9zdG5hbWUuaW5jbHVkZXMoJ2luc3RhZ3JhbS5jb20nKSkge1xcbiAgICAgIGxldCBjbGVhblVybCA9IHVybC5zcGxpdCgnPycpWzBdO1xcbiAgICAgIGlmICghY2xlYW5VcmwuZW5kc1dpdGgoJy8nKSkgY2xlYW5VcmwgKz0gJy8nO1xcbiAgICAgIHJldHVybiBgJHtjbGVhblVybH1lbWJlZGA7XFxuICAgIH1cXG5cXG4gICAgLy8gR29vZ2xlIERyaXZlXFxuICAgIGlmICh1cmkuaG9zdG5hbWUuaW5jbHVkZXMoJ2RyaXZlLmdvb2dsZS5jb20nKSkge1xcbiAgICAgIHJldHVybiB1cmwucmVwbGFjZSgvXFxcXC92aWV3KFxcXFw/LiopPyQvLCAnL3ByZXZpZXcnKS5yZXBsYWNlKC9cXFxcL2VkaXQoXFxcXD8uKik/JC8sICcvcHJldmlldycpO1xcbiAgICB9XFxuICAgIFxcbiAgICAvLyBEYWlseW1vdGlvblxcbiAgICBpZiAodXJpLmhvc3RuYW1lLmluY2x1ZGVzKCdkYWlseW1vdGlvbi5jb20nKSB8fCB1cmkuaG9zdG5hbWUuaW5jbHVkZXMoJ2RhaS5seScpKSB7XFxuICAgICAgIGNvbnN0IHZpZGVvSWQgPSB1cmkuaG9zdG5hbWUuaW5jbHVkZXMoJ2RhaS5seScpID8gdXJpLnBhdGhuYW1lLnNwbGl0KCcvJylbMV0gOiB1cmkucGF0aG5hbWUuc3BsaXQoJy92aWRlby8nKVsxXT8uc3BsaXQoJ18nKVswXTtcXG4gICAgICAgaWYgKHZpZGVvSWQpIHJldHVybiBgaHR0cHM6Ly93d3cuZGFpbHltb3Rpb24uY29tL2VtYmVkL3ZpZGVvLyR7dmlkZW9JZH1gO1xcbiAgICB9XFxuXFxuICAgIC8vIFZpbWVvXFxuICAgIGlmICh1cmkuaG9zdG5hbWUuaW5jbHVkZXMoJ3ZpbWVvLmNvbScpKSB7XFxuICAgICAgY29uc3QgdmlkZW9JZCA9IHVyaS5wYXRobmFtZS5zcGxpdCgnLycpLnBvcCgpO1xcbiAgICAgIGlmICh2aWRlb0lkKSByZXR1cm4gYGh0dHBzOi8vcGxheWVyLnZpbWVvLmNvbS92aWRlby8ke3ZpZGVvSWR9YDtcXG4gICAgfVxcblxcbiAgICAvLyBPSy5ydVxcbiAgICBpZiAodXJpLmhvc3RuYW1lLmluY2x1ZGVzKCdvay5ydScpKSB7XFxuICAgICAgY29uc3QgdmlkZW9JZCA9IHVyaS5wYXRobmFtZS5zcGxpdCgnLycpLnBvcCgpO1xcbiAgICAgIGlmICh2aWRlb0lkKSByZXR1cm4gYGh0dHBzOi8vb2sucnUvdmlkZW9lbWJlZC8ke3ZpZGVvSWR9YDtcXG4gICAgfVxcblxcbiAgfSBjYXRjaCAoZSkge1xcbiAgICByZXR1cm4gdXJsO1xcbiAgfVxcbiAgcmV0dXJuIHVybDtcXG59O1xcblxcbmZ1bmN0aW9uIGNuKC4uLmlucHV0czogQ2xhc3NWYWx1ZVtdKSB7XFxuICByZXR1cm4gdHdNZXJnZShjbHN4KGlucHV0cykpO1xcbn1cXG5cXG5jb25zdCBBcHBDb250ZXh0ID0gY3JlYXRlQ29udGV4dDxhbnk+KG51bGwpO1xcblxcbmNvbnN0IHVzZUZpbGVUb0Jhc2U2NCA9ICgpID0+IHtcXG4gIHJldHVybiAoZmlsZTogRmlsZSk6IFByb21pc2U8c3RyaW5nPiA9PiB7XFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XFxuICAgICAgY29uc3QgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcXG4gICAgICByZWFkZXIub25sb2FkID0gKCkgPT4gcmVzb2x2ZShyZWFkZXIucmVzdWx0IGFzIHN0cmluZyk7XFxuICAgICAgcmVhZGVyLm9uZXJyb3IgPSByZWplY3Q7XFxuICAgICAgcmVhZGVyLnJlYWRBc0RhdGFVUkwoZmlsZSk7XFxuICAgIH0pO1xcbiAgfTtcXG59O1xcblxcbmNvbnN0IExvYWRpbmdHaWFudCA9ICgpID0+IChcXG4gIDxkaXYgY2xhc3NOYW1lPVxcXCJmaXhlZCBpbnNldC0wIGJnLVsjMDUwNTA1XSB6LVs5OTk5XSBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBzcGFjZS15LThcXFwiPlxcbiAgICA8bW90aW9uLmRpdiBcXG4gICAgICBpbml0aWFsPXt7IHNjYWxlOiAwLjgsIG9wYWNpdHk6IDAgfX1cXG4gICAgICBhbmltYXRlPXt7IHNjYWxlOiBbMC44LCAxLjEsIDFdLCBvcGFjaXR5OiAxIH19XFxuICAgICAgdHJhbnNpdGlvbj17eyBkdXJhdGlvbjogMSwgcmVwZWF0OiBJbmZpbml0eSwgcmVwZWF0VHlwZTogXFxcInJldmVyc2VcXFwiIH19XFxuICAgICAgY2xhc3NOYW1lPVxcXCJyZWxhdGl2ZVxcXCJcXG4gICAgPlxcbiAgICAgIDxpbWcgc3JjPXtMT0dPX1VSTH0gcmVmZXJyZXJQb2xpY3k9XFxcIm5vLXJlZmVycmVyXFxcIiBjbGFzc05hbWU9XFxcInctMzIgaC0zMiByb3VuZGVkLTN4bCBib3JkZXItNCBib3JkZXItcmVkLTYwMCBzaGFkb3ctWzBfMF81MHB4X3JnYmEoMjM5LDY4LDY4LDAuNSldIG9iamVjdC1jb3ZlclxcXCIgLz5cXG4gICAgICA8bW90aW9uLmRpdiBcXG4gICAgICAgIGFuaW1hdGU9e3sgcm90YXRlOiAzNjAgfX1cXG4gICAgICAgIHRyYW5zaXRpb249e3sgZHVyYXRpb246IDQsIHJlcGVhdDogSW5maW5pdHksIGVhc2U6IFxcXCJsaW5lYXJcXFwiIH19XFxuICAgICAgICBjbGFzc05hbWU9XFxcImFic29sdXRlIC1pbnNldC00IGJvcmRlci0yIGJvcmRlci1kYXNoZWQgYm9yZGVyLXJlZC02MDAvMzAgcm91bmRlZC1mdWxsXFxcIlxcbiAgICAgIC8+XFxuICAgIDwvbW90aW9uLmRpdj5cXG4gICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIHNwYWNlLXktMlxcXCI+XFxuICAgICAgPGgyIGNsYXNzTmFtZT1cXFwidGV4dC0zeGwgZm9udC1ibGFjayB0ZXh0LXdoaXRlIGxvZ28tdGV4dC1nbG93IHRyYWNraW5nLXRpZ2h0ZXJcXFwiPti52YXZhNin2YI02KfZhNin2YbZitmF2Yo8L2gyPlxcbiAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IHNwYWNlLXgtMVxcXCI+XFxuICAgICAgICB7WzAsIDEsIDJdLm1hcCgoaSkgPT4gKFxcbiAgICAgICAgICA8bW90aW9uLmRpdlxcbiAgICAgICAgICAgIGtleT17aX1cXG4gICAgICAgICAgICBhbmltYXRlPXt7IHk6IFswLCAtMTAsIDBdIH19XFxuICAgICAgICAgICAgdHJhbnNpdGlvbj17eyBkdXJhdGlvbjogMC42LCByZXBlYXQ6IEluZmluaXR5LCBkZWxheTogaSAqIDAuMSB9fVxcbiAgICAgICAgICAgIGNsYXNzTmFtZT1cXFwidy0yIGgtMiBiZy1yZWQtNjAwIHJvdW5kZWQtZnVsbFxcXCJcXG4gICAgICAgICAgLz5cXG4gICAgICAgICkpfVxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2Plxcbik7XFxuXFxuY29uc3QgQXBwUHJvdmlkZXI6IFJlYWN0LkZDPHsgY2hpbGRyZW46IFJlYWN0LlJlYWN0Tm9kZSB9PiA9ICh7IGNoaWxkcmVuIH0pID0+IHtcXG4gIGNvbnN0IFt1c2VyLCBzZXRVc2VyXSA9IHVzZVN0YXRlPGFueSB8IG51bGw+KG51bGwpO1xcbiAgY29uc3QgW3ZpZGVvcywgc2V0VmlkZW9zXSA9IHVzZVN0YXRlPFZpZGVvW10+KFtdKTtcXG4gIGNvbnN0IFtib29rcywgc2V0Qm9va3NdID0gdXNlU3RhdGU8Qm9va1tdPihbXSk7XFxuICBjb25zdCBbc2Vhc29ucywgc2V0U2Vhc29uc10gPSB1c2VTdGF0ZTxTZWFzb25bXT4oW10pO1xcbiAgY29uc3QgW3BsYW5zLCBzZXRQbGFuc10gPSB1c2VTdGF0ZTxTdWJzY3JpcHRpb25QbGFuW10+KFtdKTtcXG4gIGNvbnN0IFtub3RpZmljYXRpb25zLCBzZXROb3RpZmljYXRpb25zXSA9IHVzZVN0YXRlPEFwcE5vdGlmaWNhdGlvbltdPihbXSk7XFxuICBjb25zdCBbcG9zdHMsIHNldFBvc3RzXSA9IHVzZVN0YXRlPFBvc3RbXT4oW10pO1xcbiAgY29uc3QgW2N1cnJlbnRWaWV3LCBzZXRDdXJyZW50Vmlld10gPSB1c2VTdGF0ZTxWaWV3PignaG9tZScpO1xcbiAgY29uc3QgW2lzQWRtaW4sIHNldElzQWRtaW5dID0gdXNlU3RhdGUoZmFsc2UpO1xcbiAgY29uc3QgW2xvYWRpbmcsIHNldExvYWRpbmddID0gdXNlU3RhdGUodHJ1ZSk7XFxuICBjb25zdCBbc2VsZWN0ZWRNZWRpYSwgc2V0U2VsZWN0ZWRNZWRpYV0gPSB1c2VTdGF0ZTxhbnk+KG51bGwpO1xcbiAgY29uc3QgW3NlbGVjdGVkU2Vhc29uLCBzZXRTZWxlY3RlZFNlYXNvbl0gPSB1c2VTdGF0ZTxTZWFzb24gfCBudWxsPihudWxsKTtcXG4gIGNvbnN0IFtsYW5ndWFnZSwgc2V0TGFuZ3VhZ2VdID0gdXNlU3RhdGU8J2FyJyB8ICdlbic+KCdhcicpO1xcbiAgY29uc3QgW3JlbWFpbmluZ01zLCBzZXRSZW1haW5pbmdNc10gPSB1c2VTdGF0ZTxudW1iZXI+KDApO1xcbiAgY29uc3QgW3Nob3dMb2dpbiwgc2V0U2hvd0xvZ2luXSA9IHVzZVN0YXRlKGZhbHNlKTtcXG4gIGNvbnN0IFtpc0xvZ2dlZCwgc2V0SXNMb2dnZWRdID0gdXNlU3RhdGUoZmFsc2UpO1xcbiAgY29uc3QgW2lzTWVudU9wZW4sIHNldElzTWVudU9wZW5dID0gdXNlU3RhdGUoZmFsc2UpO1xcbiAgY29uc3QgW2Nvb2tpZUFjY2VwdGVkLCBzZXRDb29raWVBY2NlcHRlZF0gPSB1c2VTdGF0ZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY29va2llX2FjY2VwdGVkJykgPT09ICd0cnVlJyk7XFxuICBjb25zdCBbc2VhcmNoUXVlcnksIHNldFNlYXJjaFF1ZXJ5XSA9IHVzZVN0YXRlKFxcXCJcXFwiKTtcXG4gIGNvbnN0IFthZG1pbk5hbWUsIHNldEFkbWluTmFtZV0gPSB1c2VTdGF0ZSgn2YrYs9mJINmB2LHYrSDZhdmE2YMg2KfZhNi52YXYp9mE2YLZhycpO1xcblxcbiAgY29uc3QgdCA9IHVzZU1lbW8oKCkgPT4gKHRyYW5zbGF0aW9ucyBhcyBhbnkpW2xhbmd1YWdlXSwgW2xhbmd1YWdlXSk7XFxuXFxuICBjb25zdCBsb2dpbldpdGhMaW5rS2V5ID0gYXN5bmMgKGtleTogc3RyaW5nKSA9PiB7XFxuICAgIGNvbnN0IHEgPSBxdWVyeShjb2xsZWN0aW9uKGRiLCAndXNlcnMnKSwgd2hlcmUoJ2xpbmtLZXknLCAnPT0nLCBrZXkpKTtcXG4gICAgY29uc3Qgc25hcCA9IGF3YWl0IGdldERvY3MocSk7XFxuICAgIGlmICghc25hcC5lbXB0eSkge1xcbiAgICAgIGNvbnN0IHVzZXJEYXRhID0gc25hcC5kb2NzWzBdLmRhdGEoKTtcXG4gICAgICBjb25zdCB1c2VySWQgPSBzbmFwLmRvY3NbMF0uaWQ7XFxuICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2dpYW50X3VzZXJfaWQnLCB1c2VySWQpO1xcbiAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdnaWFudF9sb2dnZWQnLCAndHJ1ZScpO1xcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTsgLy8gUmVsb2FkIHRvIGFwcGx5IG5ldyB1c2VyIElEXFxuICAgICAgcmV0dXJuIHRydWU7XFxuICAgIH1cXG4gICAgcmV0dXJuIGZhbHNlO1xcbiAgfTtcXG5cXG4gIHVzZUVmZmVjdCgoKSA9PiB7XFxuICAgIGNvbnN0IGN1cnJlbnRMYW5nID0gKHRyYW5zbGF0aW9ucyBhcyBhbnkpW2xhbmd1YWdlXTtcXG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmRpciA9IGN1cnJlbnRMYW5nLmRpcjtcXG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmxhbmcgPSBsYW5ndWFnZTtcXG4gIH0sIFtsYW5ndWFnZV0pO1xcblxcbiAgdXNlRWZmZWN0KCgpID0+IHtcXG4gICAgbGV0IHNhdmVkSWQgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZ2lhbnRfdXNlcl9pZCcpO1xcbiAgICBpZiAobG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2dpYW50X2xvZ2dlZCcpID09PSAndHJ1ZScpIHNldElzTG9nZ2VkKHRydWUpO1xcbiAgICBpZiAoIXNhdmVkSWQpIHsgc2F2ZWRJZCA9IFxcXCJ1c2VyX1xcXCIgKyBEYXRlLm5vdygpOyBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnZ2lhbnRfdXNlcl9pZCcsIHNhdmVkSWQpOyB9XFxuXFxuICAgIGNvbnN0IHVuc3ViVXNlciA9IG9uU25hcHNob3QoZG9jKGRiLCAndXNlcnMnLCBzYXZlZElkKSwgYXN5bmMgKHNuYXApID0+IHtcXG4gICAgICBpZiAoc25hcC5leGlzdHMoKSkge1xcbiAgICAgICAgY29uc3QgZGF0YSA9IHNuYXAuZGF0YSgpO1xcbiAgICAgICAgaWYgKGRhdGEuaXNCYW5uZWQpIHsgXFxuICAgICAgICAgIGFsZXJ0KFxcXCLYo9mG2Kog2YXYt9ix2YjYryDZhdmGINmH2LDZhyDZhdmF2YTZg9ipLlxcXCIpOyBcXG4gICAgICAgICAgc2V0SXNMb2dnZWQoZmFsc2UpOyBcXG4gICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2dpYW50X2xvZ2dlZCcsICdmYWxzZScpO1xcbiAgICAgICAgICByZXR1cm47IFxcbiAgICAgICAgfVxcbiAgICAgICAgXFxuICAgICAgICAvLyBFbnN1cmUgbGlua0tleSBleGlzdHMgZm9yIGV4aXN0aW5nIHVzZXJzXFxuICAgICAgICBpZiAoIWRhdGEubGlua0tleSkge1xcbiAgICAgICAgICBjb25zdCBsaW5rS2V5ID0gXFxcIkdLLVxcXCIgKyBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoMiwgMTApLnRvVXBwZXJDYXNlKCk7XFxuICAgICAgICAgIGF3YWl0IHVwZGF0ZURvYyhkb2MoZGIsICd1c2VycycsIHNhdmVkSWQpLCB7IGxpbmtLZXkgfSk7XFxuICAgICAgICB9XFxuXFxuICAgICAgICBzZXRVc2VyKHsgaWQ6IHNuYXAuaWQsIC4uLmRhdGEgfSk7XFxuICAgICAgICBpZiAoZGF0YS5uYW1lID09PSBhZG1pbk5hbWUgfHwgZGF0YS5uYW1lID09PSAn2YrYs9mJINmB2LHYrSDZhdmE2YMg2KfZhNi52YXYp9mE2YLZhycpIHNldElzQWRtaW4odHJ1ZSk7XFxuICAgICAgICBlbHNlIHNldElzQWRtaW4oZmFsc2UpO1xcblxcbiAgICAgICAgaWYgKGRhdGEuaXNTdWJzY3JpYmVkICYmIGRhdGEuc3Vic2NyaXB0aW9uRW5kRGF0ZSAmJiBOdW1iZXIoZGF0YS5zdWJzY3JpcHRpb25FbmREYXRlKSA8IERhdGUubm93KCkpIHtcXG4gICAgICAgICAgYXdhaXQgdXBkYXRlRG9jKGRvYyhkYiwgJ3VzZXJzJywgc2F2ZWRJZCksIHsgaXNTdWJzY3JpYmVkOiBmYWxzZSwgc3Vic2NyaXB0aW9uRW5kRGF0ZTogMCB9KTtcXG4gICAgICAgIH1cXG4gICAgICB9IGVsc2Uge1xcbiAgICAgICAgY29uc3QgbGlua0tleSA9IFxcXCJHSy1cXFwiICsgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDIsIDEwKS50b1VwcGVyQ2FzZSgpO1xcbiAgICAgICAgY29uc3QgbmV3VXNlciA9IHsgaWQ6IHNhdmVkSWQsIG5hbWU6ICfYudmF2YTYp9mCINis2K/ZitivJywgcGhvdG9Vcmw6IExPR09fVVJMLCBpc1N1YnNjcmliZWQ6IGZhbHNlLCBjcmVhdGVkQXQ6IERhdGUubm93KCksIGRpc21pc3NlZE5vdGlmaWNhdGlvbnM6IFtdLCBsaW5rS2V5IH07XFxuICAgICAgICBzZXRVc2VyKG5ld1VzZXIgYXMgYW55KTtcXG4gICAgICAgIGF3YWl0IHNldERvYyhkb2MoZGIsICd1c2VycycsIHNhdmVkSWQpLCBuZXdVc2VyKTtcXG4gICAgICB9XFxuICAgICAgc2V0TG9hZGluZyhmYWxzZSk7XFxuICAgIH0sIChlcnJvcikgPT4ge1xcbiAgICAgIGNvbnNvbGUuZXJyb3IoXFxcIkZpcmViYXNlIEVycm9yOlxcXCIsIGVycm9yKTtcXG4gICAgICBzZXRMb2FkaW5nKGZhbHNlKTsgLy8gU3RvcCBsb2FkaW5nIG9uIGVycm9yXFxuICAgIH0pO1xcblxcbiAgICBjb25zdCB1bnN1YlNldHRpbmdzID0gb25TbmFwc2hvdChkb2MoZGIsICdzZXR0aW5ncycsICdhZG1pbicpLCAoc25hcCkgPT4ge1xcbiAgICAgIGlmIChzbmFwLmV4aXN0cygpKSB7XFxuICAgICAgICBzZXRBZG1pbk5hbWUoc25hcC5kYXRhKCkubmFtZSk7XFxuICAgICAgfVxcbiAgICB9KTtcXG5cXG4gICAgb25TbmFwc2hvdChxdWVyeShjb2xsZWN0aW9uKGRiLCAndmlkZW9zJyksIG9yZGVyQnkoJ2NyZWF0ZWRBdCcsICdkZXNjJykpLCBzID0+IHNldFZpZGVvcyhzLmRvY3MubWFwKGQgPT4gKHtpZDpkLmlkLCAuLi5kLmRhdGEoKX0gYXMgYW55KSkpKTtcXG4gICAgb25TbmFwc2hvdChxdWVyeShjb2xsZWN0aW9uKGRiLCAnYm9va3MnKSwgb3JkZXJCeSgnY3JlYXRlZEF0JywgJ2Rlc2MnKSksIHMgPT4gc2V0Qm9va3Mocy5kb2NzLm1hcChkID0+ICh7aWQ6ZC5pZCwgLi4uZC5kYXRhKCl9IGFzIGFueSkpKSk7XFxuICAgIG9uU25hcHNob3QocXVlcnkoY29sbGVjdGlvbihkYiwgJ3NlYXNvbnMnKSwgb3JkZXJCeSgnY3JlYXRlZEF0JywgJ2Rlc2MnKSksIHMgPT4gc2V0U2Vhc29ucyhzLmRvY3MubWFwKGQgPT4gKHtpZDpkLmlkLCAuLi5kLmRhdGEoKX0gYXMgYW55KSkpKTtcXG4gICAgb25TbmFwc2hvdChjb2xsZWN0aW9uKGRiLCAnc3Vic2NyaXB0aW9uX3BsYW5zJyksIHMgPT4gc2V0UGxhbnMocy5kb2NzLm1hcChkID0+ICh7aWQ6ZC5pZCwgLi4uZC5kYXRhKCl9IGFzIGFueSkpKSk7XFxuICAgIG9uU25hcHNob3QocXVlcnkoY29sbGVjdGlvbihkYiwgJ25vdGlmaWNhdGlvbnMnKSwgb3JkZXJCeSgndGltZXN0YW1wJywgJ2Rlc2MnKSksIHMgPT4gc2V0Tm90aWZpY2F0aW9ucyhzLmRvY3MubWFwKGQgPT4gKHtpZDpkLmlkLCAuLi5kLmRhdGEoKX0gYXMgYW55KSkpKTtcXG4gICAgb25TbmFwc2hvdChxdWVyeShjb2xsZWN0aW9uKGRiLCAncG9zdHMnKSwgb3JkZXJCeSgndGltZXN0YW1wJywgJ2Rlc2MnKSksIHMgPT4gc2V0UG9zdHMocy5kb2NzLm1hcChkID0+ICh7aWQ6ZC5pZCwgLi4uZC5kYXRhKCl9IGFzIGFueSkpKSk7XFxuXFxuICAgIHJldHVybiAoKSA9PiB7IHVuc3ViVXNlcigpOyB1bnN1YlNldHRpbmdzKCk7IH07XFxuICB9LCBbYWRtaW5OYW1lXSk7XFxuXFxuICB1c2VFZmZlY3QoKCkgPT4ge1xcbiAgICBsZXQgaW50ZXJ2YWw6IGFueTtcXG4gICAgaWYgKHVzZXI/LmlzU3Vic2NyaWJlZCAmJiB0eXBlb2YgdXNlcj8uc3Vic2NyaXB0aW9uRW5kRGF0ZSA9PT0gJ251bWJlcicgJiYgdXNlci5zdWJzY3JpcHRpb25FbmREYXRlID4gMCkge1xcbiAgICAgIGludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xcbiAgICAgICAgY29uc3QgZGlmZiA9IE51bWJlcih1c2VyLnN1YnNjcmlwdGlvbkVuZERhdGUpIC0gRGF0ZS5ub3coKTtcXG4gICAgICAgIGlmIChkaWZmIDw9IDApIHsgXFxuICAgICAgICAgIHNldFJlbWFpbmluZ01zKDApOyBcXG4gICAgICAgICAgaWYgKGludGVydmFsKSBjbGVhckludGVydmFsKGludGVydmFsKTsgXFxuICAgICAgICB9IGVsc2UgeyBcXG4gICAgICAgICAgc2V0UmVtYWluaW5nTXMoZGlmZik7IFxcbiAgICAgICAgfVxcbiAgICAgIH0sIDEwMDApO1xcbiAgICB9IGVsc2UgeyBcXG4gICAgICBzZXRSZW1haW5pbmdNcygwKTsgXFxuICAgIH1cXG4gICAgcmV0dXJuICgpID0+IHsgaWYgKGludGVydmFsKSBjbGVhckludGVydmFsKGludGVydmFsKTsgfTtcXG4gIH0sIFt1c2VyXSk7XFxuXFxuICByZXR1cm4gKFxcbiAgICA8QXBwQ29udGV4dC5Qcm92aWRlciB2YWx1ZT17eyBcXG4gICAgICB1c2VyLCB2aWRlb3MsIGJvb2tzLCBzZWFzb25zLCBwbGFucywgbm90aWZpY2F0aW9ucywgY3VycmVudFZpZXcsIHNldFZpZXc6IHNldEN1cnJlbnRWaWV3LCBcXG4gICAgICBpc0FkbWluLCBsb2FkaW5nLCB0LCBzZWxlY3RlZE1lZGlhLCBzZXRTZWxlY3RlZE1lZGlhLFxcbiAgICAgIHNlbGVjdGVkU2Vhc29uLCBzZXRTZWxlY3RlZFNlYXNvbixcXG4gICAgICBsYW5ndWFnZSwgc2V0TGFuZ3VhZ2UsIHJlbWFpbmluZ01zLCBzaG93TG9naW4sIHNldFNob3dMb2dpbiwgaXNMb2dnZWQsIHNldElzTG9nZ2VkLCBcXG4gICAgICBwb3N0cywgaXNNZW51T3Blbiwgc2V0SXNNZW51T3BlbiwgY29va2llQWNjZXB0ZWQsIHNldENvb2tpZUFjY2VwdGVkLCBsb2dpbldpdGhMaW5rS2V5LFxcbiAgICAgIHNlYXJjaFF1ZXJ5LCBzZXRTZWFyY2hRdWVyeSwgYWRtaW5OYW1lXFxuICAgIH19PlxcbiAgICAgIDxBbmltYXRlUHJlc2VuY2UgbW9kZT1cXFwid2FpdFxcXCI+XFxuICAgICAgICB7bG9hZGluZyA/IDxMb2FkaW5nR2lhbnQga2V5PVxcXCJsb2FkZXJcXFwiIC8+IDogY2hpbGRyZW59XFxuICAgICAgPC9BbmltYXRlUHJlc2VuY2U+XFxuICAgIDwvQXBwQ29udGV4dC5Qcm92aWRlcj5cXG4gICk7XFxufTtcXG5cXG5jb25zdCBZb3VyQWNjb3VudCA9ICgpID0+IHtcXG4gIGNvbnN0IHsgdCwgdXNlciwgaXNBZG1pbiwgcmVtYWluaW5nTXMgfSA9IHVzZUNvbnRleHQoQXBwQ29udGV4dCk7XFxuICBjb25zdCBbY29waWVkLCBzZXRDb3BpZWRdID0gdXNlU3RhdGUoZmFsc2UpO1xcblxcbiAgY29uc3QgY29weVRvQ2xpcGJvYXJkID0gKCkgPT4ge1xcbiAgICBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dCh1c2VyPy5saW5rS2V5IHx8IFxcXCJcXFwiKTtcXG4gICAgc2V0Q29waWVkKHRydWUpO1xcbiAgICBzZXRUaW1lb3V0KCgpID0+IHNldENvcGllZChmYWxzZSksIDIwMDApO1xcbiAgfTtcXG5cXG4gIGNvbnN0IGZvcm1hdFRpbWUgPSAobXM6IG51bWJlcikgPT4ge1xcbiAgICBjb25zdCBzID0gTWF0aC5mbG9vcihtcyAvIDEwMDApO1xcbiAgICBjb25zdCBkID0gTWF0aC5mbG9vcihzIC8gODY0MDApO1xcbiAgICBjb25zdCBoID0gTWF0aC5mbG9vcigocyAlIDg2NDAwKSAvIDM2MDApO1xcbiAgICBjb25zdCBtID0gTWF0aC5mbG9vcigocyAlIDM2MDApIC8gNjApO1xcbiAgICBjb25zdCBzZWMgPSBzICUgNjA7XFxuICAgIHJldHVybiBgJHtkfSR7dC5kYXlzfSAke2h9OiR7bX06JHtzZWN9YDtcXG4gIH07XFxuXFxuICByZXR1cm4gKFxcbiAgICA8ZGl2IGNsYXNzTmFtZT1cXFwibWF4LXctMnhsIG14LWF1dG8gc3BhY2UteS04IGFuaW1hdGUtZmFkZS1pbiBwYi0yMCBweC00XFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwidGV4dC1jZW50ZXIgc3BhY2UteS02XFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJyZWxhdGl2ZSBpbmxpbmUtYmxvY2tcXFwiPlxcbiAgICAgICAgICA8aW1nIHNyYz17dXNlcj8ucGhvdG9VcmwgfHwgTE9HT19VUkx9IHJlZmVycmVyUG9saWN5PVxcXCJuby1yZWZlcnJlclxcXCIgY2xhc3NOYW1lPVxcXCJ3LTMyIGgtMzIgc206dy00OCBzbTpoLTQ4IHJvdW5kZWQtWzJyZW1dIHNtOnJvdW5kZWQtWzNyZW1dIGJvcmRlci00IGJvcmRlci1yZWQtNjAwIHNoYWRvdy0yeGwgb2JqZWN0LWNvdmVyIG14LWF1dG9cXFwiIC8+XFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJhYnNvbHV0ZSAtYm90dG9tLTIgLXJpZ2h0LTIgYmctcmVkLTYwMCB0ZXh0LXdoaXRlIHAtMiByb3VuZGVkLXhsIHNoYWRvdy1sZ1xcXCI+XFxuICAgICAgICAgICAgPFNoaWVsZENoZWNrIHNpemU9ezIwfSAvPlxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInNwYWNlLXktMlxcXCI+XFxuICAgICAgICAgIDxoMiBjbGFzc05hbWU9XFxcInRleHQtMnhsIHNtOnRleHQtNXhsIGZvbnQtYmxhY2sgdGV4dC13aGl0ZSBsb2dvLXRleHQtZ2xvd1xcXCI+e3VzZXI/Lm5hbWV9PC9oMj5cXG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVxcXCJ0ZXh0LXJlZC01MDAgZm9udC1ibGFjayB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXN0IHRleHQteHMgc206dGV4dC1zbVxcXCI+e2lzQWRtaW4gPyB0LmFkbWluUmFuayA6IHQudXNlclJhbmt9PC9wPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgPC9kaXY+XFxuXFxuICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImdyaWQgZ2FwLTRcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImJnLXdoaXRlLzUgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBwLTYgcm91bmRlZC0zeGwgc3BhY2UteS00XFxcIj5cXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlclxcXCI+XFxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVxcXCJ0ZXh0LWdyYXktNTAwIGZvbnQtYmxhY2sgdXBwZXJjYXNlIHRleHQtWzEwcHhdXFxcIj57dC5zdWJTdGF0dXN9PC9zcGFuPlxcbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT17YHB4LTMgcHktMSByb3VuZGVkLWZ1bGwgdGV4dC1bMTBweF0gZm9udC1ibGFjayB1cHBlcmNhc2UgJHt1c2VyPy5pc1N1YnNjcmliZWQgPyAnYmctZ3JlZW4tNjAwLzIwIHRleHQtZ3JlZW4tNTAwJyA6ICdiZy1yZWQtNjAwLzIwIHRleHQtcmVkLTUwMCd9YH0+XFxuICAgICAgICAgICAgICB7dXNlcj8uaXNTdWJzY3JpYmVkID8gdC5hY3RpdmUgOiB0LmV4cGlyZWR9XFxuICAgICAgICAgICAgPC9zcGFuPlxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAge3VzZXI/LmlzU3Vic2NyaWJlZCAmJiAoXFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInNwYWNlLXktMlxcXCI+XFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVxcXCJ0ZXh0LWdyYXktNTAwIGZvbnQtYmxhY2sgdXBwZXJjYXNlIHRleHQtWzEwcHhdXFxcIj57dC5zdWJUeXBlfTwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVxcXCJ0ZXh0LXdoaXRlIGZvbnQtYmxhY2sgdGV4dC1zbVxcXCI+e3VzZXIuc3Vic2NyaXB0aW9uVHlwZX08L3NwYW4+XFxuICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGp1c3RpZnktYmV0d2VlbiBpdGVtcy1jZW50ZXJcXFwiPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XFxcInRleHQtZ3JheS01MDAgZm9udC1ibGFjayB1cHBlcmNhc2UgdGV4dC1bMTBweF1cXFwiPnt0LnRpbWVMZWZ0fTwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVxcXCJ0ZXh0LXdoaXRlIGZvbnQtbW9ubyB0ZXh0LXNtXFxcIj57cmVtYWluaW5nTXMgPiAwID8gZm9ybWF0VGltZShyZW1haW5pbmdNcykgOiBcXFwiMDA6MDA6MDBcXFwifTwvc3Bhbj5cXG4gICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICApfVxcbiAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiYmctd2hpdGUvNSBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHAtNiByb3VuZGVkLTN4bCBzcGFjZS15LTRcXFwiPlxcbiAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPVxcXCJ0ZXh0LWdyYXktNTAwIGZvbnQtYmxhY2sgdXBwZXJjYXNlIHRleHQtWzEwcHhdIGJsb2NrXFxcIj57dC5saW5rS2V5fTwvbGFiZWw+XFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGdhcC0yXFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleC0xIGJnLWJsYWNrLzQwIGJvcmRlciBib3JkZXItd2hpdGUvNSBwLTQgcm91bmRlZC14bCB0ZXh0LXdoaXRlIGZvbnQtbW9ubyB0ZXh0LXhzIHNtOnRleHQtc20gYnJlYWstYWxsIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyXFxcIj5cXG4gICAgICAgICAgICAgIHt1c2VyPy5saW5rS2V5fVxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17Y29weVRvQ2xpcGJvYXJkfSBjbGFzc05hbWU9XFxcImJnLXJlZC02MDAgdGV4dC13aGl0ZSBweC00IHJvdW5kZWQteGwgaG92ZXI6YmctcmVkLTcwMCB0cmFuc2l0aW9uLWFsbCBhY3RpdmU6c2NhbGUtOTVcXFwiPlxcbiAgICAgICAgICAgICAge2NvcGllZCA/IDxTaGllbGRDaGVjayBzaXplPXsxOH0gLz4gOiA8RXh0ZXJuYWxMaW5rIHNpemU9ezE4fSAvPn1cXG4gICAgICAgICAgICA8L2J1dHRvbj5cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cXFwidGV4dC1bOXB4XSB0ZXh0LWdyYXktNjAwIGZvbnQtbWVkaXVtIHRleHQtY2VudGVyIGxlYWRpbmctcmVsYXhlZFxcXCI+XFxuICAgICAgICAgICAge3QuZGlyID09PSAncnRsJyBcXG4gICAgICAgICAgICAgID8gXFxcItin2LPYqtiu2K/ZhSDZh9iw2Kcg2KfZhNmF2YHYqtin2K0g2YTZhNiv2K7ZiNmEINil2YTZiSDYrdiz2KfYqNmDINmF2YYg2KPZiiDYrNmH2KfYsiDYotiu2LEuINit2KfZgdi4INi52YTZitmHINiz2LHYp9mLIVxcXCIgXFxuICAgICAgICAgICAgICA6IFxcXCJVc2UgdGhpcyBrZXkgdG8gYWNjZXNzIHlvdXIgYWNjb3VudCBmcm9tIGFueSBvdGhlciBkZXZpY2UuIEtlZXAgaXQgc2VjcmV0IVxcXCJ9XFxuICAgICAgICAgIDwvcD5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gICk7XFxufTtcXG5cXG5jb25zdCBGaWxlSW5wdXQgPSAoeyBsYWJlbCwgb25WYWx1ZUNoYW5nZSwgcGxhY2Vob2xkZXIsIHZhbHVlIH06IHsgbGFiZWw6IHN0cmluZywgb25WYWx1ZUNoYW5nZTogKHZhbDogc3RyaW5nKSA9PiB2b2lkLCBwbGFjZWhvbGRlcjogc3RyaW5nLCB2YWx1ZT86IHN0cmluZyB9KSA9PiB7XFxuICBjb25zdCBbbW9kZSwgc2V0TW9kZV0gPSB1c2VTdGF0ZTwndXJsJyB8ICdkZXZpY2UnPigndXJsJyk7XFxuICBjb25zdCBmaWxlUmVmID0gdXNlUmVmPEhUTUxJbnB1dEVsZW1lbnQ+KG51bGwpO1xcbiAgY29uc3QgZmlsZVRvQmFzZTY0ID0gdXNlRmlsZVRvQmFzZTY0KCk7XFxuXFxuICBjb25zdCBoYW5kbGVEZXZpY2UgPSBhc3luYyAoZTogUmVhY3QuQ2hhbmdlRXZlbnQ8SFRNTElucHV0RWxlbWVudD4pID0+IHtcXG4gICAgY29uc3QgZmlsZSA9IGUudGFyZ2V0LmZpbGVzPy5bMF07XFxuICAgIGlmIChmaWxlKSB7XFxuICAgICAgY29uc3QgYjY0ID0gYXdhaXQgZmlsZVRvQmFzZTY0KGZpbGUgYXMgRmlsZSk7XFxuICAgICAgb25WYWx1ZUNoYW5nZShiNjQpO1xcbiAgICB9XFxuICB9O1xcblxcbiAgcmV0dXJuIChcXG4gICAgPGRpdiBjbGFzc05hbWU9XFxcInNwYWNlLXktMlxcXCI+XFxuICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBweC0xXFxcIj5cXG4gICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XFxcInRleHQteHMgZm9udC1ibGFjayB1cHBlcmNhc2UgdGV4dC1ncmF5LTUwMFxcXCI+e2xhYmVsfTwvbGFiZWw+XFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBnYXAtMlxcXCI+XFxuICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gc2V0TW9kZSgndXJsJyl9IGNsYXNzTmFtZT17YHAtMSBweC0zIHJvdW5kZWQtbGcgdGV4dC1bOXB4XSBmb250LWJsYWNrIHVwcGVyY2FzZSB0cmFuc2l0aW9uLWFsbCAke21vZGUgPT09ICd1cmwnID8gJ2JnLXJlZC02MDAgdGV4dC13aGl0ZScgOiAnYmctd2hpdGUvNSB0ZXh0LWdyYXktNjAwJ31gfT48R2xvYmUyIHNpemU9ezEyfSBjbGFzc05hbWU9XFxcImlubGluZSBtci0xXFxcIi8+IFVSTDwvYnV0dG9uPlxcbiAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHNldE1vZGUoJ2RldmljZScpfSBjbGFzc05hbWU9e2BwLTEgcHgtMyByb3VuZGVkLWxnIHRleHQtWzlweF0gZm9udC1ibGFjayB1cHBlcmNhc2UgdHJhbnNpdGlvbi1hbGwgJHttb2RlID09PSAnZGV2aWNlJyA/ICdiZy1yZWQtNjAwIHRleHQtd2hpdGUnIDogJ2JnLXdoaXRlLzUgdGV4dC1ncmF5LTYwMCd9YH0+PEhhcmREcml2ZSBzaXplPXsxMn0gY2xhc3NOYW1lPVxcXCJpbmxpbmUgbXItMVxcXCIvPiBEZXZpY2U8L2J1dHRvbj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIHttb2RlID09PSAndXJsJyA/IChcXG4gICAgICAgIDxpbnB1dCB2YWx1ZT17dmFsdWV9IHBsYWNlaG9sZGVyPXtwbGFjZWhvbGRlcn0gb25DaGFuZ2U9e2UgPT4gb25WYWx1ZUNoYW5nZShlLnRhcmdldC52YWx1ZSl9IGNsYXNzTmFtZT1cXFwidy1mdWxsIGJnLXdoaXRlLzUgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBwLTQgcm91bmRlZC14bCB0ZXh0LXdoaXRlIG91dGxpbmUtbm9uZSBmb2N1czpib3JkZXItcmVkLTYwMCB0cmFuc2l0aW9uLWFsbCB0ZXh0LXhzXFxcIiAvPlxcbiAgICAgICkgOiAoXFxuICAgICAgICA8ZGl2IG9uQ2xpY2s9eygpID0+IGZpbGVSZWYuY3VycmVudD8uY2xpY2soKX0gY2xhc3NOYW1lPVxcXCJ3LWZ1bGwgYmctd2hpdGUvNSBib3JkZXItMiBib3JkZXItZGFzaGVkIGJvcmRlci13aGl0ZS8xMCBwLTQgcm91bmRlZC14bCB0ZXh0LWNlbnRlciBjdXJzb3ItcG9pbnRlciBob3Zlcjpib3JkZXItcmVkLTYwMC81MCB0cmFuc2l0aW9uLWFsbCB0ZXh0LWdyYXktNTAwIHRleHQtWzEwcHhdXFxcIj5cXG4gICAgICAgICAge3ZhbHVlID8gXFxcItiq2YUg2KfYrtiq2YrYp9ixINmF2YTZgVxcXCIgOiBcXFwiQ2xpY2sgdG8gVXBsb2FkIEZyb20gRGV2aWNlXFxcIn1cXG4gICAgICAgICAgPGlucHV0IHR5cGU9XFxcImZpbGVcXFwiIHJlZj17ZmlsZVJlZn0gY2xhc3NOYW1lPVxcXCJoaWRkZW5cXFwiIG9uQ2hhbmdlPXtoYW5kbGVEZXZpY2V9IC8+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICApfVxcbiAgICA8L2Rpdj5cXG4gICk7XFxufTtcXG5cXG5jb25zdCBBZG1pblBhbmVsID0gKCkgPT4ge1xcbiAgY29uc3QgeyB0LCB2aWRlb3MsIGJvb2tzLCBwbGFucywgaXNBZG1pbiwgcG9zdHMsIG5vdGlmaWNhdGlvbnMsIHNlYXNvbnMsIGFkbWluTmFtZSB9ID0gdXNlQ29udGV4dChBcHBDb250ZXh0KTtcXG4gIGNvbnN0IFt0YWIsIHNldFRhYl0gPSB1c2VTdGF0ZTwncmVxdWVzdHMnIHwgJ2NvbnRlbnQnIHwgJ3BsYW5zJyB8ICd1c2VycycgfCAncG9zdHMnIHwgJ2NvbW1lbnRzJyB8ICdub3RpZnMnIHwgJ3NlYXNvbnMnIHwgJ3NldHRpbmdzJyB8ICdjb2RlJz4oJ3JlcXVlc3RzJyk7XFxuICBjb25zdCBbc291cmNlQ29kZSwgc2V0U291cmNlQ29kZV0gPSB1c2VTdGF0ZTx7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9Pih7fSk7XFxuICBjb25zdCBbbG9hZGluZ0NvZGUsIHNldExvYWRpbmdDb2RlXSA9IHVzZVN0YXRlKGZhbHNlKTtcXG5cXG4gIHVzZUVmZmVjdCgoKSA9PiB7XFxuICAgIGlmICh0YWIgPT09ICdjb2RlJyAmJiBPYmplY3Qua2V5cyhzb3VyY2VDb2RlKS5sZW5ndGggPT09IDApIHtcXG4gICAgICBmZXRjaENvZGUoKTtcXG4gICAgfVxcbiAgfSwgW3RhYl0pO1xcblxcbiAgY29uc3QgZmV0Y2hDb2RlID0gYXN5bmMgKCkgPT4ge1xcbiAgICBzZXRMb2FkaW5nQ29kZSh0cnVlKTtcXG4gICAgY29uc3QgZmlsZXMgPSBbJ0FwcC50c3gnLCAnZmlyZWJhc2UudHMnLCAndHlwZXMudHMnXTtcXG4gICAgY29uc3QgY29kZTogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfSA9IHt9O1xcbiAgICBmb3IgKGNvbnN0IGYgb2YgZmlsZXMpIHtcXG4gICAgICB0cnkge1xcbiAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goYC8ke2Z9P3Jhd2ApO1xcbiAgICAgICAgaWYgKHJlcy5vaykgY29kZVtmXSA9IGF3YWl0IHJlcy50ZXh0KCk7XFxuICAgICAgfSBjYXRjaCAoZSkge1xcbiAgICAgICAgY29uc29sZS5lcnJvcihlKTtcXG4gICAgICB9XFxuICAgIH1cXG4gICAgc2V0U291cmNlQ29kZShjb2RlKTtcXG4gICAgc2V0TG9hZGluZ0NvZGUoZmFsc2UpO1xcbiAgfTtcXG4gIGNvbnN0IFtyZXFzLCBzZXRSZXFzXSA9IHVzZVN0YXRlPGFueVtdPihbXSk7XFxuICBjb25zdCBbdXNlcnMsIHNldFVzZXJzXSA9IHVzZVN0YXRlPGFueVtdPihbXSk7XFxuICBjb25zdCBmaWxlVG9CYXNlNjQgPSB1c2VGaWxlVG9CYXNlNjQoKTtcXG4gIFxcbiAgY29uc3QgW2VkaXRpbmdQb3N0SWQsIHNldEVkaXRpbmdQb3N0SWRdID0gdXNlU3RhdGU8c3RyaW5nIHwgbnVsbD4obnVsbCk7XFxuICBjb25zdCBbbmV3UG9zdCwgc2V0TmV3UG9zdF0gPSB1c2VTdGF0ZTx7dGl0bGU6IHN0cmluZywgY29udGVudDogc3RyaW5nLCBpbWFnZXM6IHN0cmluZ1tdLCBzb3VyY2VVcmw6IHN0cmluZ30+KHsgdGl0bGU6IFxcXCJcXFwiLCBjb250ZW50OiBcXFwiXFxcIiwgaW1hZ2VzOiBbXSwgc291cmNlVXJsOiBcXFwiXFxcIiB9KTtcXG4gIGNvbnN0IFtlZGl0aW5nVmlkSWQsIHNldEVkaXRpbmdWaWRJZF0gPSB1c2VTdGF0ZTxzdHJpbmcgfCBudWxsPihudWxsKTtcXG4gIGNvbnN0IFtuZXdWaWQsIHNldE5ld1ZpZF0gPSB1c2VTdGF0ZSh7IHRpdGxlOiBcXFwiXFxcIiwgZGVzY3JpcHRpb246IFxcXCJcXFwiLCB0aHVtYm5haWxVcmw6IFxcXCJcXFwiLCB2aWRlb1VybDogXFxcIlxcXCIsIHNvdXJjZVVybDogXFxcIlxcXCIsIGNhdGVnb3J5OiAnb3BlbicgYXMgQ2F0ZWdvcnksIGFsbG93RG93bmxvYWQ6IGZhbHNlIH0pO1xcbiAgY29uc3QgW2VkaXRpbmdCb29rSWQsIHNldEVkaXRpbmdCb29rSWRdID0gdXNlU3RhdGU8c3RyaW5nIHwgbnVsbD4obnVsbCk7XFxuICBjb25zdCBbbmV3Qm9vaywgc2V0TmV3Qm9va10gPSB1c2VTdGF0ZSh7IHRpdGxlOiBcXFwiXFxcIiwgZGVzY3JpcHRpb246IFxcXCJcXFwiLCB0aHVtYm5haWxVcmw6IFxcXCJcXFwiLCBib29rVXJsOiBcXFwiXFxcIiwgc291cmNlVXJsOiBcXFwiXFxcIiwgY2F0ZWdvcnk6ICdvcGVuJyBhcyBDYXRlZ29yeSwgYWxsb3dEb3dubG9hZDogZmFsc2UgfSk7XFxuICBjb25zdCBbZWRpdGluZ1BsYW5JZCwgc2V0RWRpdGluZ1BsYW5JZF0gPSB1c2VTdGF0ZTxzdHJpbmcgfCBudWxsPihudWxsKTtcXG4gIGNvbnN0IFtuZXdQbGFuLCBzZXROZXdQbGFuXSA9IHVzZVN0YXRlKHsgbmFtZTogXFxcIlxcXCIsIHByaWNlOiAwLCB3aGF0c2FwcDogXFxcIlxcXCIsIGR1cmF0aW9uOiAzMCwgdW5pdDogJ2RheXMnIGFzIER1cmF0aW9uVW5pdCB9KTtcXG4gIGNvbnN0IFtlZGl0aW5nU2Vhc29uSWQsIHNldEVkaXRpbmdTZWFzb25JZF0gPSB1c2VTdGF0ZTxzdHJpbmcgfCBudWxsPihudWxsKTtcXG4gIGNvbnN0IFtuZXdTZWFzb24sIHNldE5ld1NlYXNvbl0gPSB1c2VTdGF0ZSh7IHRpdGxlOiBcXFwiXFxcIiwgZGVzY3JpcHRpb246IFxcXCJcXFwiLCB0aHVtYm5haWxVcmw6IFxcXCJcXFwiLCBjYXRlZ29yeTogJ29wZW4nIGFzIENhdGVnb3J5LCB2aWRlb0lkczogW10gYXMgc3RyaW5nW10gfSk7XFxuICBjb25zdCBbYWxsQ29tbWVudHMsIHNldEFsbENvbW1lbnRzXSA9IHVzZVN0YXRlPGFueVtdPihbXSk7XFxuICBjb25zdCBbbmV3QWRtaW5OYW1lLCBzZXROZXdBZG1pbk5hbWVdID0gdXNlU3RhdGUoYWRtaW5OYW1lKTtcXG5cXG4gIHVzZUVmZmVjdCgoKSA9PiB7XFxuICAgIHNldE5ld0FkbWluTmFtZShhZG1pbk5hbWUpO1xcbiAgfSwgW2FkbWluTmFtZV0pO1xcblxcbiAgY29uc3QgW2lzRG93bmxvYWRpbmcsIHNldElzRG93bmxvYWRpbmddID0gdXNlU3RhdGUoZmFsc2UpO1xcbiAgY29uc3QgW2Rvd25sb2FkU3RhdHVzLCBzZXREb3dubG9hZFN0YXR1c10gPSB1c2VTdGF0ZTxzdHJpbmcgfCBudWxsPihudWxsKTtcXG5cXG4gIGNvbnN0IGRvd25sb2FkUHJvamVjdEZpbGVzID0gYXN5bmMgKCkgPT4ge1xcbiAgICBzZXRJc0Rvd25sb2FkaW5nKHRydWUpO1xcbiAgICBzZXREb3dubG9hZFN0YXR1cyhcXFwi2KzYp9ix2Yog2KrYrdi22YrYsSDYp9mE2YXZhNmB2KfYqi4uLlxcXCIpO1xcbiAgICBjb25zdCB6aXAgPSBuZXcgSlNaaXAoKTtcXG4gICAgY29uc3QgZmlsZXMgPSBbXFxuICAgICAgeyBuYW1lOiAnQXBwLnRzeCcsIHBhdGg6ICcvQXBwLnRzeCcgfSxcXG4gICAgICB7IG5hbWU6ICdmaXJlYmFzZS50cycsIHBhdGg6ICcvZmlyZWJhc2UudHMnIH0sXFxuICAgICAgeyBuYW1lOiAnaW5kZXguaHRtbCcsIHBhdGg6ICcvaW5kZXguaHRtbCcgfSxcXG4gICAgICB7IG5hbWU6ICdpbmRleC50c3gnLCBwYXRoOiAnL2luZGV4LnRzeCcgfSxcXG4gICAgICB7IG5hbWU6ICdtZXRhZGF0YS5qc29uJywgcGF0aDogJy9tZXRhZGF0YS5qc29uJyB9LFxcbiAgICAgIHsgbmFtZTogJ3BhY2thZ2UuanNvbicsIHBhdGg6ICcvcGFja2FnZS5qc29uJyB9LFxcbiAgICAgIHsgbmFtZTogJ3RzY29uZmlnLmpzb24nLCBwYXRoOiAnL3RzY29uZmlnLmpzb24nIH0sXFxuICAgICAgeyBuYW1lOiAndHlwZXMudHMnLCBwYXRoOiAnL3R5cGVzLnRzJyB9LFxcbiAgICAgIHsgbmFtZTogJ3ZpdGUuY29uZmlnLnRzJywgcGF0aDogJy92aXRlLmNvbmZpZy50cycgfSxcXG4gICAgICB7IG5hbWU6ICcuZ2l0aWdub3JlJywgcGF0aDogJy8uZ2l0aWdub3JlJyB9LFxcbiAgICAgIHsgbmFtZTogJ25ldGxpZnkudG9tbCcsIHBhdGg6ICcvbmV0bGlmeS50b21sJyB9LFxcbiAgICAgIHsgbmFtZTogJy5udm1yYycsIHBhdGg6ICcvLm52bXJjJyB9XFxuICAgIF07XFxuICAgIFxcbiAgICBsZXQgYXBwQ29udGVudCA9ICcnO1xcbiAgICBsZXQgZmlyZWJhc2VDb250ZW50ID0gJyc7XFxuICAgIGxldCB0eXBlc0NvbnRlbnQgPSAnJztcXG4gICAgbGV0IGluZGV4SHRtbENvbnRlbnQgPSAnJztcXG5cXG4gICAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XFxuICAgICAgdHJ5IHtcXG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7ZmlsZS5wYXRofSR7ZmlsZS5wYXRoLm1hdGNoKC9cXFxcLih0c3g/fGpzeD98Y3NzKSQvKSA/ICc/cmF3JyA6ICcnfWApO1xcbiAgICAgICAgaWYgKHJlc3BvbnNlLm9rKSB7XFxuICAgICAgICAgIGxldCBjb250ZW50ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xcbiAgICAgICAgICBpZiAoY29udGVudC5zdGFydHNXaXRoKCdleHBvcnQgZGVmYXVsdCBcXFwiJykgJiYgY29udGVudC5lbmRzV2l0aCgnXFxcIicpKSB7XFxuICAgICAgICAgICAgIHRyeSB7XFxuICAgICAgICAgICAgICAgY29uc3Qgc3RyaW5nTGl0ZXJhbCA9IGNvbnRlbnQucmVwbGFjZSgvXmV4cG9ydCBkZWZhdWx0IC8sICcnKS5yZXBsYWNlKC87JC8sICcnKTtcXG4gICAgICAgICAgICAgICBjb250ZW50ID0gSlNPTi5wYXJzZShzdHJpbmdMaXRlcmFsKTtcXG4gICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xcbiAgICAgICAgICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoL15leHBvcnQgZGVmYXVsdCBcXFwiLywgJycpLnJlcGxhY2UoL1xcXCIkLywgJycpLnJlcGxhY2UoL1xcXFxcXFxcbi9nLCAnXFxcXG4nKS5yZXBsYWNlKC9cXFxcXFxcXFxcXCIvZywgJ1xcXCInKTtcXG4gICAgICAgICAgICAgfVxcbiAgICAgICAgICB9XFxuICAgICAgICAgIFxcbiAgICAgICAgICBpZiAoZmlsZS5uYW1lID09PSAnQXBwLnRzeCcpIGFwcENvbnRlbnQgPSBjb250ZW50O1xcbiAgICAgICAgICBpZiAoZmlsZS5uYW1lID09PSAnZmlyZWJhc2UudHMnKSBmaXJlYmFzZUNvbnRlbnQgPSBjb250ZW50O1xcbiAgICAgICAgICBpZiAoZmlsZS5uYW1lID09PSAndHlwZXMudHMnKSB0eXBlc0NvbnRlbnQgPSBjb250ZW50O1xcbiAgICAgICAgICBpZiAoZmlsZS5uYW1lID09PSAnaW5kZXguaHRtbCcpIGluZGV4SHRtbENvbnRlbnQgPSBjb250ZW50O1xcblxcbiAgICAgICAgICAvLyBDbGVhbiBpbmRleC5odG1sIGZyb20gQUxMIGluamVjdGVkIHNjcmlwdHMgYW5kIGZpeCBRdWlya3MgTW9kZVxcbiAgICAgICAgICBpZiAoZmlsZS5uYW1lID09PSAnaW5kZXguaHRtbCcpIHtcXG4gICAgICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKC88c2NyaXB0XFxcXHMrc3JjPVxcXCJcXFxcL19fYWlzdHVkaW9faW50ZXJuYWxfY29udHJvbF9wbGFuZVxcXFwvW15cXFwiXStcXFwiPjxcXFxcL3NjcmlwdD4vZywgJycpO1xcbiAgICAgICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoLzxzY3JpcHRcXFxccytzcmM9XFxcImFpc3R1ZGlvLWlmcmFtZVxcXFwuanNcXFwiPjxcXFxcL3NjcmlwdD4vZywgJycpO1xcbiAgICAgICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnRyaW0oKTsgXFxuICAgICAgICAgIH1cXG4gICAgICAgICAgXFxuICAgICAgICAgIHppcC5maWxlKGZpbGUubmFtZSwgY29udGVudCk7XFxuICAgICAgICB9XFxuICAgICAgfSBjYXRjaCAoZXJyKSB7XFxuICAgICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gZmV0Y2ggJHtmaWxlLm5hbWV9YCwgZXJyKTtcXG4gICAgICB9XFxuICAgIH1cXG5cXG4gICAgLy8gQ3JlYXRlIFN0YW5kYWxvbmUgVmVyc2lvblxcbiAgICBjb25zdCBjbGVhblR5cGVzID0gdHlwZXNDb250ZW50LnJlcGxhY2UoL2V4cG9ydFxcXFxzKy9nLCAnJyk7XFxuICAgIGNvbnN0IGNsZWFuRmlyZWJhc2UgPSBmaXJlYmFzZUNvbnRlbnRcXG4gICAgICAucmVwbGFjZSgvaW1wb3J0W1xcXFxzXFxcXFNdKj9mcm9tXFxcXHMrW1xcXCInXWZpcmViYXNlXFxcXC8uKltcXFwiJ107Py9nLCAnJylcXG4gICAgICAucmVwbGFjZSgvZXhwb3J0XFxcXHMrL2csICcnKTtcXG4gICAgY29uc3QgY2xlYW5BcHAgPSBhcHBDb250ZW50XFxuICAgICAgLnJlcGxhY2UoL2ltcG9ydFtcXFxcc1xcXFxTXSo/ZnJvbVxcXFxzK1snXFxcIl1cXFxcLlxcXFwvLipbJ1xcXCJdOz8vZywgJycpXFxuICAgICAgLnJlcGxhY2UoL2ltcG9ydFtcXFxcc1xcXFxTXSo/ZnJvbVxcXFxzK1snXFxcIl1maXJlYmFzZVxcXFwvLipbJ1xcXCJdOz8vZywgJycpXFxuICAgICAgLnJlcGxhY2UoL2ltcG9ydFtcXFxcc1xcXFxTXSo/ZnJvbVxcXFxzK1snXFxcIl1sdWNpZGUtcmVhY3RbJ1xcXCJdOz8vZywgJycpXFxuICAgICAgLnJlcGxhY2UoL2ltcG9ydFtcXFxcc1xcXFxTXSo/ZnJvbVxcXFxzK1snXFxcIl1mcmFtZXItbW90aW9uWydcXFwiXTs/L2csICcnKVxcbiAgICAgIC5yZXBsYWNlKC9pbXBvcnRbXFxcXHNcXFxcU10qP2Zyb21cXFxccytbJ1xcXCJdY2xzeFsnXFxcIl07Py9nLCAnJylcXG4gICAgICAucmVwbGFjZSgvaW1wb3J0W1xcXFxzXFxcXFNdKj9mcm9tXFxcXHMrWydcXFwiXXRhaWx3aW5kLW1lcmdlWydcXFwiXTs/L2csICcnKVxcbiAgICAgIC5yZXBsYWNlKC9pbXBvcnRbXFxcXHNcXFxcU10qP2Zyb21cXFxccytbJ1xcXCJdanN6aXBbJ1xcXCJdOz8vZywgJycpXFxuICAgICAgLnJlcGxhY2UoL2ltcG9ydFtcXFxcc1xcXFxTXSo/ZnJvbVxcXFxzK1snXFxcIl1maWxlLXNhdmVyWydcXFwiXTs/L2csICcnKVxcbiAgICAgIC5yZXBsYWNlKC9pbXBvcnRbXFxcXHNcXFxcU10qP1JlYWN0LD9cXFxccypcXFxce1tcXFxcc1xcXFxTXSo/XFxcXH1cXFxccytmcm9tXFxcXHMrWydcXFwiXXJlYWN0WydcXFwiXTs/L2csICcnKVxcbiAgICAgIC5yZXBsYWNlKC9leHBvcnRcXFxccytkZWZhdWx0XFxcXHMrZnVuY3Rpb25cXFxccytBcHBcXFxcKFxcXFwpXFxcXHMrXFxcXHsvZywgJ2Z1bmN0aW9uIEFwcCgpIHsnKVxcbiAgICAgIC5yZXBsYWNlKC9leHBvcnRcXFxccytjb25zdFxcXFxzKy9nLCAnY29uc3QgJylcXG4gICAgICAucmVwbGFjZSgvZXhwb3J0XFxcXHMraW50ZXJmYWNlXFxcXHMrL2csICdpbnRlcmZhY2UgJylcXG4gICAgICAucmVwbGFjZSgvZXhwb3J0XFxcXHMrdHlwZVxcXFxzKy9nLCAndHlwZSAnKTtcXG5cXG4gICAgY29uc3Qgc3RhbmRhbG9uZUh0bWwgPSBgPCFET0NUWVBFIGh0bWw+XFxuPGh0bWwgbGFuZz1cXFwiYXJcXFwiIGRpcj1cXFwicnRsXFxcIj5cXG48aGVhZD5cXG4gICAgPG1ldGEgY2hhcnNldD1cXFwiVVRGLThcXFwiIC8+XFxuICAgIDxtZXRhIG5hbWU9XFxcInZpZXdwb3J0XFxcIiBjb250ZW50PVxcXCJ3aWR0aD1kZXZpY2Utd2lkdGgsIGluaXRpYWwtc2NhbGU9MS4wXFxcIiAvPlxcbiAgICA8dGl0bGU+QW5pbWU0R2lhbnQgLSDYudmF2YTYp9mCINin2YTYp9mG2YrZhdmKPC90aXRsZT5cXG4gICAgPHNjcmlwdCBzcmM9XFxcImh0dHBzOi8vY2RuLnRhaWx3aW5kY3NzLmNvbVxcXCI+PC9zY3JpcHQ+XFxuICAgIDxzY3JpcHQgc3JjPVxcXCJodHRwczovL3VucGtnLmNvbS9AYmFiZWwvc3RhbmRhbG9uZS9iYWJlbC5taW4uanNcXFwiPjwvc2NyaXB0PlxcbiAgICA8c2NyaXB0IHR5cGU9XFxcImltcG9ydG1hcFxcXCI+XFxuICAgIHtcXG4gICAgICBcXFwiaW1wb3J0c1xcXCI6IHtcXG4gICAgICAgIFxcXCJyZWFjdFxcXCI6IFxcXCJodHRwczovL2VzbS5zaC9yZWFjdEAxOFxcXCIsXFxuICAgICAgICBcXFwicmVhY3QtZG9tXFxcIjogXFxcImh0dHBzOi8vZXNtLnNoL3JlYWN0LWRvbUAxOFxcXCIsXFxuICAgICAgICBcXFwicmVhY3QtZG9tL2NsaWVudFxcXCI6IFxcXCJodHRwczovL2VzbS5zaC9yZWFjdC1kb21AMTgvY2xpZW50XFxcIixcXG4gICAgICAgIFxcXCJmaXJlYmFzZS9hcHBcXFwiOiBcXFwiaHR0cHM6Ly9lc20uc2gvZmlyZWJhc2VAMTAvYXBwXFxcIixcXG4gICAgICAgIFxcXCJmaXJlYmFzZS9maXJlc3RvcmVcXFwiOiBcXFwiaHR0cHM6Ly9lc20uc2gvZmlyZWJhc2VAMTAvZmlyZXN0b3JlXFxcIixcXG4gICAgICAgIFxcXCJsdWNpZGUtcmVhY3RcXFwiOiBcXFwiaHR0cHM6Ly9lc20uc2gvbHVjaWRlLXJlYWN0XFxcIixcXG4gICAgICAgIFxcXCJmcmFtZXItbW90aW9uXFxcIjogXFxcImh0dHBzOi8vZXNtLnNoL2ZyYW1lci1tb3Rpb25cXFwiLFxcbiAgICAgICAgXFxcImNsc3hcXFwiOiBcXFwiaHR0cHM6Ly9lc20uc2gvY2xzeFxcXCIsXFxuICAgICAgICBcXFwidGFpbHdpbmQtbWVyZ2VcXFwiOiBcXFwiaHR0cHM6Ly9lc20uc2gvdGFpbHdpbmQtbWVyZ2VcXFwiLFxcbiAgICAgICAgXFxcImpzemlwXFxcIjogXFxcImh0dHBzOi8vZXNtLnNoL2pzemlwXFxcIixcXG4gICAgICAgIFxcXCJmaWxlLXNhdmVyXFxcIjogXFxcImh0dHBzOi8vZXNtLnNoL2ZpbGUtc2F2ZXJcXFwiXFxuICAgICAgfVxcbiAgICB9XFxuICAgIDwvc2NyaXB0PlxcbiAgICA8bGluayBocmVmPVxcXCJodHRwczovL2ZvbnRzLmdvb2dsZWFwaXMuY29tL2NzczI/ZmFtaWx5PUNhaXJvOndnaHRANDAwOzcwMDs5MDAmZGlzcGxheT1zd2FwXFxcIiByZWw9XFxcInN0eWxlc2hlZXRcXFwiPlxcbiAgICA8c3R5bGU+XFxuICAgICAgYm9keSB7IGZvbnQtZmFtaWx5OiAnQ2Fpcm8nLCBzYW5zLXNlcmlmOyBiYWNrZ3JvdW5kLWNvbG9yOiAjMDUwNTA1OyBjb2xvcjogd2hpdGU7IG1hcmdpbjogMDsgb3ZlcmZsb3cteDogaGlkZGVuOyB9XFxuICAgICAgLmdsYXNzLWVmZmVjdCB7IGJhY2tncm91bmQ6IHJnYmEoMCwgMCwgMCwgMC40KTsgYmFja2Ryb3AtZmlsdGVyOiBibHVyKDI1cHgpOyAtd2Via2l0LWJhY2tkcm9wLWZpbHRlcjogYmx1cigyNXB4KTsgYm9yZGVyOiAxcHggc29saWQgcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjA1KTsgfVxcbiAgICAgIC5sb2dvLXRleHQtZ2xvdyB7IHRleHQtc2hhZG93OiAwIDAgMTBweCByZ2JhKDIzOSwgNjgsIDY4LCAwLjgpLCAwIDAgMjBweCByZ2JhKDIzOSwgNjgsIDY4LCAwLjQpOyB9XFxuICAgICAgQGtleWZyYW1lcyBmYWRlLWluIHsgZnJvbSB7IG9wYWNpdHk6IDA7IHRyYW5zZm9ybTogdHJhbnNsYXRlWSgxMHB4KTsgfSB0byB7IG9wYWNpdHk6IDE7IHRyYW5zZm9ybTogdHJhbnNsYXRlWSgwKTsgfSB9XFxuICAgICAgLmFuaW1hdGUtZmFkZS1pbiB7IGFuaW1hdGlvbjogZmFkZS1pbiAwLjRzIGVhc2Utb3V0IGZvcndhcmRzOyB9XFxuICAgICAgI2Vycm9yLWRpc3BsYXkgeyBkaXNwbGF5OiBub25lOyBwb3NpdGlvbjogZml4ZWQ7IGluc2V0OiAwOyBiYWNrZ3JvdW5kOiAjMDAwOyBjb2xvcjogI2ZmNDQ0NDsgcGFkZGluZzogMjBweDsgZm9udC1mYW1pbHk6IG1vbm9zcGFjZTsgei1pbmRleDogOTk5OTsgb3ZlcmZsb3c6IGF1dG87IH1cXG4gICAgPC9zdHlsZT5cXG48L2hlYWQ+XFxuPGJvZHk+XFxuICAgIDxkaXYgaWQ9XFxcInJvb3RcXFwiPjwvZGl2PlxcbiAgICA8ZGl2IGlkPVxcXCJlcnJvci1kaXNwbGF5XFxcIj5cXG4gICAgICA8aDE+2K7Yt9ijINmB2Yog2KrYrdmF2YrZhCDYp9mE2YXZiNmC2Lk8L2gxPlxcbiAgICAgIDxwPtit2K/YqyDYrti32KMg2KPYq9mG2KfYoSDZhdit2KfZiNmE2Kkg2KrYtNi62YrZhCDYp9mE2YXZiNmC2LkuINmK2LHYrNmJINin2YTYqtij2YPYryDZhdmGINij2YbZgyDZgtmF2Kog2KjYpdi22KfZgdipINix2KfYqNi3INmH2LDYpyDYp9mE2YXZiNmC2Lkg2KXZhNmJIDxiPkF1dGhvcml6ZWQgRG9tYWluczwvYj4g2YHZiiDYpdi52K/Yp9iv2KfYqiBGaXJlYmFzZS48L3A+XFxuICAgICAgPHByZSBpZD1cXFwiZXJyb3ItZGV0YWlsc1xcXCI+PC9wcmU+XFxuICAgIDwvZGl2PlxcbiAgICA8c2NyaXB0IHR5cGU9XFxcInRleHQvYmFiZWxcXFwiIGRhdGEtdHlwZT1cXFwibW9kdWxlXFxcIiBkYXRhLXByZXNldHM9XFxcInJlYWN0LHR5cGVzY3JpcHRcXFwiPlxcbiAgICAgICAgaW1wb3J0IFJlYWN0LCB7IHVzZVN0YXRlLCB1c2VFZmZlY3QsIGNyZWF0ZUNvbnRleHQsIHVzZUNvbnRleHQsIHVzZVJlZiwgdXNlTWVtbyB9IGZyb20gJ3JlYWN0JztcXG4gICAgICAgIGltcG9ydCBSZWFjdERPTSBmcm9tICdyZWFjdC1kb20vY2xpZW50JztcXG4gICAgICAgIGltcG9ydCB7IGluaXRpYWxpemVBcHAgfSBmcm9tIFxcXCJmaXJlYmFzZS9hcHBcXFwiO1xcbiAgICAgICAgaW1wb3J0IHsgZ2V0RmlyZXN0b3JlLCBjb2xsZWN0aW9uLCBvblNuYXBzaG90LCBxdWVyeSwgb3JkZXJCeSwgYWRkRG9jLCBkb2MsIGRlbGV0ZURvYywgdXBkYXRlRG9jLCBsaW1pdCwgc2V0RG9jLCB3aGVyZSwgZ2V0RG9jcyB9IGZyb20gXFxcImZpcmViYXNlL2ZpcmVzdG9yZVxcXCI7XFxuICAgICAgICBpbXBvcnQgKiBhcyBMdWNpZGVJY29ucyBmcm9tICdsdWNpZGUtcmVhY3QnO1xcbiAgICAgICAgaW1wb3J0IHsgbW90aW9uLCBBbmltYXRlUHJlc2VuY2UgfSBmcm9tICdmcmFtZXItbW90aW9uJztcXG4gICAgICAgIGltcG9ydCB7IGNsc3ggfSBmcm9tICdjbHN4JztcXG4gICAgICAgIGltcG9ydCB7IHR3TWVyZ2UgfSBmcm9tICd0YWlsd2luZC1tZXJnZSc7XFxuICAgICAgICBpbXBvcnQgSlNaaXAgZnJvbSAnanN6aXAnO1xcbiAgICAgICAgaW1wb3J0IHsgc2F2ZUFzIH0gZnJvbSAnZmlsZS1zYXZlcic7XFxuXFxuICAgICAgICAvLyBEZXN0cnVjdHVyZSBMdWNpZGUgSWNvbnNcXG4gICAgICAgIGNvbnN0IHsgSG9tZSwgRmxhbWUsIE1lc3NhZ2VTcXVhcmUsIExvY2ssIFNldHRpbmdzLCBUcmFzaDIsIFgsIFNlbmQsIEJvb2tPcGVuLCBDaGV2cm9uTGVmdCwgQmVsbCwgU2hpZWxkQ2hlY2ssIFBsYXksIFBob25lQ2FsbCwgSW5mbywgR2xvYmUyLCBTaGllbGRBbGVydCwgTWVzc2FnZUNpcmNsZSwgRXh0ZXJuYWxMaW5rLCBVc2VyUGx1cywgQ2FsZW5kYXIsIEVkaXQzLCBOZXdzcGFwZXIsIFJlcGx5LCBMb2dPdXQsIEhhcmREcml2ZSwgQ2FtZXJhLCBWaWRlbzogVmlkZW9JY29uLCBVc2VyQ2lyY2xlLCBTZWFyY2gsIERvd25sb2FkLCBTaGFyZTIsIExheWVycyB9ID0gTHVjaWRlSWNvbnM7XFxuXFxuICAgICAgICAvLyBHbG9iYWwgQ29uc3RhbnRzXFxuICAgICAgICBjb25zdCBMT0dPX1VSTCA9IFxcXCIke0xPR09fVVJMfVxcXCI7XFxuXFxuICAgICAgICAvLyBIZWxwZXI6IGNuXFxuICAgICAgICBmdW5jdGlvbiBjbiguLi5pbnB1dHMpIHtcXG4gICAgICAgICAgcmV0dXJuIHR3TWVyZ2UoY2xzeChpbnB1dHMpKTtcXG4gICAgICAgIH1cXG5cXG4gICAgICAgIC8vIFR5cGVzXFxuICAgICAgICAke2NsZWFuVHlwZXN9XFxuXFxuICAgICAgICAvLyBGaXJlYmFzZVxcbiAgICAgICAgJHtjbGVhbkZpcmViYXNlfVxcblxcbiAgICAgICAgLy8gQXBwXFxuICAgICAgICAke2NsZWFuQXBwfVxcblxcbiAgICAgICAgLy8gTW91bnRcXG4gICAgICAgIHRyeSB7XFxuICAgICAgICAgIGNvbnN0IHJvb3QgPSBSZWFjdERPTS5jcmVhdGVSb290KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyb290JykpO1xcbiAgICAgICAgICByb290LnJlbmRlcig8QXBwIC8+KTtcXG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFxcXCJNb3VudCBFcnJvcjpcXFwiLCBlcnIpO1xcbiAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZXJyb3ItZGlzcGxheScpLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xcbiAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZXJyb3ItZGV0YWlscycpLmlubmVyVGV4dCA9IGVyci5zdGFjayB8fCBlcnIubWVzc2FnZTtcXG4gICAgICAgIH1cXG4gICAgPC9zY3JpcHQ+XFxuPC9ib2R5PlxcbjwvaHRtbD5gO1xcblxcbiAgICB6aXAuZmlsZSgnaW5kZXguaHRtbCcsIGluZGV4SHRtbENvbnRlbnQpOyAvLyBTb3VyY2UgaW5kZXguaHRtbFxcbiAgICB6aXAuZmlsZSgnc3RhbmRhbG9uZS5odG1sJywgc3RhbmRhbG9uZUh0bWwsIHsgYmluYXJ5OiBmYWxzZSB9KTsgLy8gT25lLWZpbGUgdmVyc2lvblxcbiAgICB6aXAuZmlsZSgncHVibGljL19yZWRpcmVjdHMnLCAnLyogL2luZGV4Lmh0bWwgMjAwJyk7XFxuXFxuICAgIC8vIEFkZCBSRUFETUUubWQgd2l0aCBpbnN0cnVjdGlvbnNcXG4gICAgY29uc3QgcmVhZG1lID0gYCMgQW5pbWU0R2lhbnQgLSDYudmF2YTYp9mCINin2YTYp9mG2YrZhdmKXFxuXFxuIyMg8J+agCDZg9mK2YEg2KrYrNi52YQg2KfZhNmF2YjZgti5INmK2LnZhdmEINmB2YjYsdin2YvYn1xcblxcbtmE2K/ZitmDINiu2YrYp9ix2KfZhiDZhNmE2LHZgdi5OlxcblxcbiMjIyDYp9mE2K7Zitin2LEg2KfZhNij2YjZhDog2KfZhNix2YHYuSDYp9mE2YXYqNin2LTYsSAo2KfZhNij2LPZh9mEINmI2KfZhNij2LbZhdmGKVxcbjEuINmC2YUg2KjZgdmDINin2YTYtti62Lcg2LnZhiDZh9iw2Kcg2KfZhNmF2YTZgS5cXG4yLiDYp9ix2YHYuSDZhdmE2YEgKipcXFxcYHN0YW5kYWxvbmUuaHRtbFxcXFxgKiog2KXZhNmJIE5ldGxpZnkg2KPZiCBHaXRIdWIgUGFnZXMuXFxuMy4g2YLZhSDYqNiq2LrZitmK2LEg2KfYs9mF2Ycg2KXZhNmJICoqXFxcXGBpbmRleC5odG1sXFxcXGAqKiDYqNi52K8g2KfZhNix2YHYuS5cXG40LiAqKtmH2KfZhSDYrNiv2KfZizoqKiDZitis2Kgg2LnZhNmK2YMg2KXYttin2YHYqSDYsdin2KjYtyDZhdmI2YLYudmDINin2YTYrNiv2YrYryAo2YXYq9mE2KfZizogXFxcXGBodHRwczovL3lvdXItc2l0ZS5uZXRsaWZ5LmFwcFxcXFxgKSDYpdmE2Ykg2YLYp9im2YXYqSAqKlxcXCJBdXRob3JpemVkIERvbWFpbnNcXFwiKiog2YHZiiDYpdi52K/Yp9iv2KfYqiBGaXJlYmFzZSDYp9mE2K7Yp9i12Kkg2KjZg9iMINmI2KXZhNinINmB2YTZhiDZitiq2YUg2KrYrdmF2YrZhCDYp9mE2KjZitin2YbYp9iqLlxcblxcbiMjIyDYp9mE2K7Zitin2LEg2KfZhNir2KfZhtmKOiDYp9mE2LHZgdi5INi52KjYsSBHaXRIdWIgKNmE2YTZhdit2KrYsdmB2YrZhilcXG4xLiDYp9ix2YHYuSDZg9mEINmH2LDZhyDYp9mE2YXZhNmB2KfYqiDYpdmE2Ykg2YXYs9iq2YjYr9i5INis2K/ZitivINi52YTZiSBHaXRIdWIuXFxuMi4g2KfYsdio2Lcg2KfZhNmF2LPYqtmI2K/YuSDYqNmAIE5ldGxpZnkuXFxuMy4g2KfYs9iq2K7Yr9mFINin2YTYpdi52K/Yp9iv2KfYqiDYp9mE2KrYp9mE2YrYqSDZgdmKIE5ldGxpZnk6XFxuICAgLSAqKkJ1aWxkIENvbW1hbmQ6KiogXFxcXGBucG0gcnVuIGJ1aWxkXFxcXGBcXG4gICAtICoqUHVibGlzaCBkaXJlY3Rvcnk6KiogXFxcXGBkaXN0XFxcXGBcXG40LiDYqtij2YPYryDZhdmGINil2LbYp9mB2Kkg2LHYp9io2LcgTmV0bGlmeSDYpdmE2YkgRmlyZWJhc2UgQXV0aG9yaXplZCBEb21haW5zLlxcblxcbiMjIyDZhNmF2KfYsNinINiq2LjZh9ixINi02KfYtNipINiz2YjYr9in2KEg2KPZiCDZhNinINmK2YHYqtitINin2YTZhdmI2YLYudifXFxuMS4gKirYudiv2YUg2KrZgdi52YrZhCDYp9mE2K/ZiNmF2YrZhiDZgdmKIEZpcmViYXNlOioqINin2LDZh9ioINil2YTZiSBGaXJlYmFzZSBDb25zb2xlIC0+IEF1dGhlbnRpY2F0aW9uIC0+IFNldHRpbmdzIC0+IEF1dGhvcml6ZWQgRG9tYWlucyDZiNij2LbZgSDYsdin2KjYtyDZhdmI2YLYudmDLlxcbjIuICoq2KfYs9iq2K7Yr9in2YUg2YXZhNmB2KfYqiDYp9mE2YXYtdiv2LEg2YXYqNin2LTYsdipOioqINin2YTZhdiq2LXZgditINmE2Kcg2YrZgdmH2YUg2YXZhNmB2KfYqiBcXFxcYC50c3hcXFxcYCDZhdio2KfYtNix2KnYjCDZitis2Kgg2KfYs9iq2K7Yr9in2YUg2YXZhNmBIFxcXFxgc3RhbmRhbG9uZS5odG1sXFxcXGAg2KPZiCDYudmF2YQgQnVpbGQg2YTZhNmF2LTYsdmI2LkuXFxuMy4gKirZhdi02YPZhNipINmB2Yog2KfZhNin2KrYtdin2YQ6Kiog2KrYo9mD2K8g2YXZhiDYo9mGINmF2YHYp9iq2YrYrSBGaXJlYmFzZSDZgdmKINmF2YTZgSBcXFxcYGZpcmViYXNlLnRzXFxcXGAg2LXYrdmK2K3YqSDZiNiq2LnZhdmELlxcbmA7XFxuICAgIHppcC5maWxlKCdSRUFETUUubWQnLCByZWFkbWUpO1xcbiAgICBcXG4gICAgY29uc3QgY29udGVudCA9IGF3YWl0IHppcC5nZW5lcmF0ZUFzeW5jKHsgdHlwZTogJ2Jsb2InIH0pO1xcbiAgICBzYXZlQXMoY29udGVudCwgJ2FuaW1lNGdpYW50X3Byb2plY3QuemlwJyk7XFxuICAgIHNldElzRG93bmxvYWRpbmcoZmFsc2UpO1xcbiAgICBzZXREb3dubG9hZFN0YXR1cyhcXFwi2KrZhSDYp9mE2KrYrdmF2YrZhCDYqNmG2KzYp9itIVxcXCIpO1xcbiAgICBzZXRUaW1lb3V0KCgpID0+IHNldERvd25sb2FkU3RhdHVzKG51bGwpLCAzMDAwKTtcXG4gIH07XFxuXFxuICBjb25zdCBzYXZlU2V0dGluZ3MgPSBhc3luYyAoKSA9PiB7XFxuICAgIGlmICghbmV3QWRtaW5OYW1lKSByZXR1cm47XFxuICAgIGF3YWl0IHNldERvYyhkb2MoZGIsICdzZXR0aW5ncycsICdhZG1pbicpLCB7IG5hbWU6IG5ld0FkbWluTmFtZSB9KTtcXG4gICAgYWxlcnQodC5zYXZlU2V0dGluZ3MpO1xcbiAgfTtcXG5cXG4gIHVzZUVmZmVjdCgoKSA9PiB7XFxuICAgIGlmICghaXNBZG1pbikgcmV0dXJuO1xcbiAgICBvblNuYXBzaG90KHF1ZXJ5KGNvbGxlY3Rpb24oZGIsICdzdWJzY3JpcHRpb25fcmVxdWVzdHMnKSwgb3JkZXJCeSgndGltZXN0YW1wJywgJ2Rlc2MnKSksIHMgPT4gc2V0UmVxcyhzLmRvY3MubWFwKGQgPT4gKHtpZDpkLmlkLCAuLi5kLmRhdGEoKX0pKSkpO1xcbiAgICBvblNuYXBzaG90KGNvbGxlY3Rpb24oZGIsICd1c2VycycpLCBzID0+IHNldFVzZXJzKHMuZG9jcy5tYXAoZCA9PiAoe2lkOmQuaWQsIC4uLmQuZGF0YSgpfSkpKSk7XFxuICAgIG9uU25hcHNob3QocXVlcnkoY29sbGVjdGlvbihkYiwgJ2NvbW1lbnRzJyksIG9yZGVyQnkoJ3RpbWVzdGFtcCcsICdkZXNjJykpLCBzID0+IHNldEFsbENvbW1lbnRzKHMuZG9jcy5tYXAoZCA9PiAoe2lkOmQuaWQsIC4uLmQuZGF0YSgpfSkpKSk7XFxuICB9LCBbaXNBZG1pbl0pO1xcblxcbiAgY29uc3QgaGFuZGxlUG9zdEltYWdlcyA9IGFzeW5jIChlOiBSZWFjdC5DaGFuZ2VFdmVudDxIVE1MSW5wdXRFbGVtZW50PikgPT4ge1xcbiAgICBjb25zdCBmaWxlcyA9IEFycmF5LmZyb20oZS50YXJnZXQuZmlsZXMgfHwgW10pLnNsaWNlKDAsIDMwKTtcXG4gICAgY29uc3QgYjY0cyA9IGF3YWl0IFByb21pc2UuYWxsKGZpbGVzLm1hcChmID0+IGZpbGVUb0Jhc2U2NChmIGFzIEZpbGUpKSk7XFxuICAgIHNldE5ld1Bvc3QocCA9PiAoeyAuLi5wLCBpbWFnZXM6IFsuLi5wLmltYWdlcywgLi4uYjY0c10uc2xpY2UoMCwgMzApIH0pKTtcXG4gIH07XFxuXFxuICBjb25zdCBzYXZlUG9zdCA9IGFzeW5jICgpID0+IHtcXG4gICAgaWYgKCFuZXdQb3N0LnRpdGxlIHx8ICFuZXdQb3N0LmNvbnRlbnQpIHJldHVybjtcXG4gICAgaWYgKGVkaXRpbmdQb3N0SWQpIHtcXG4gICAgICBhd2FpdCB1cGRhdGVEb2MoZG9jKGRiLCAncG9zdHMnLCBlZGl0aW5nUG9zdElkKSwgeyAuLi5uZXdQb3N0IH0pO1xcbiAgICAgIHNldEVkaXRpbmdQb3N0SWQobnVsbCk7XFxuICAgIH0gZWxzZSB7XFxuICAgICAgYXdhaXQgYWRkRG9jKGNvbGxlY3Rpb24oZGIsICdwb3N0cycpLCB7IC4uLm5ld1Bvc3QsIHRpbWVzdGFtcDogRGF0ZS5ub3coKSwgYWRtaW5OYW1lOiB0LmFkbWluUmFuayB9KTtcXG4gICAgfVxcbiAgICBzZXROZXdQb3N0KHsgdGl0bGU6IFxcXCJcXFwiLCBjb250ZW50OiBcXFwiXFxcIiwgaW1hZ2VzOiBbXSwgc291cmNlVXJsOiBcXFwiXFxcIiB9KTtcXG4gICAgYWxlcnQoXFxcItiq2YUg2KfZhNit2YHYuCDYqNmG2KzYp9itIVxcXCIpO1xcbiAgfTtcXG5cXG4gIGNvbnN0IHNhdmVWaWRlbyA9IGFzeW5jICgpID0+IHtcXG4gICAgaWYgKCFuZXdWaWQudGl0bGUgfHwgIW5ld1ZpZC52aWRlb1VybCkgcmV0dXJuO1xcbiAgICBpZiAoZWRpdGluZ1ZpZElkKSB7XFxuICAgICAgYXdhaXQgdXBkYXRlRG9jKGRvYyhkYiwgJ3ZpZGVvcycsIGVkaXRpbmdWaWRJZCksIHsgLi4ubmV3VmlkIH0pO1xcbiAgICAgIHNldEVkaXRpbmdWaWRJZChudWxsKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICBhd2FpdCBhZGREb2MoY29sbGVjdGlvbihkYiwgJ3ZpZGVvcycpLCB7IC4uLm5ld1ZpZCwgY3JlYXRlZEF0OiBEYXRlLm5vdygpIH0pO1xcbiAgICB9XFxuICAgIHNldE5ld1ZpZCh7IHRpdGxlOiBcXFwiXFxcIiwgZGVzY3JpcHRpb246IFxcXCJcXFwiLCB0aHVtYm5haWxVcmw6IFxcXCJcXFwiLCB2aWRlb1VybDogXFxcIlxcXCIsIHNvdXJjZVVybDogXFxcIlxcXCIsIGNhdGVnb3J5OiAnb3BlbicsIGFsbG93RG93bmxvYWQ6IGZhbHNlIH0pO1xcbiAgICBhbGVydChcXFwi2KrZhSDYp9mE2K3Zgdi4IVxcXCIpO1xcbiAgfTtcXG5cXG4gIGNvbnN0IHNhdmVCb29rID0gYXN5bmMgKCkgPT4ge1xcbiAgICBpZiAoIW5ld0Jvb2sudGl0bGUgfHwgIW5ld0Jvb2suYm9va1VybCkgcmV0dXJuO1xcbiAgICBpZiAoZWRpdGluZ0Jvb2tJZCkge1xcbiAgICAgIGF3YWl0IHVwZGF0ZURvYyhkb2MoZGIsICdib29rcycsIGVkaXRpbmdCb29rSWQpLCB7IC4uLm5ld0Jvb2sgfSk7XFxuICAgICAgc2V0RWRpdGluZ0Jvb2tJZChudWxsKTtcXG4gICAgfSBlbHNlIHtcXG4gICAgICBhd2FpdCBhZGREb2MoY29sbGVjdGlvbihkYiwgJ2Jvb2tzJyksIHsgLi4ubmV3Qm9vaywgY3JlYXRlZEF0OiBEYXRlLm5vdygpIH0pO1xcbiAgICB9XFxuICAgIHNldE5ld0Jvb2soeyB0aXRsZTogXFxcIlxcXCIsIGRlc2NyaXB0aW9uOiBcXFwiXFxcIiwgdGh1bWJuYWlsVXJsOiBcXFwiXFxcIiwgYm9va1VybDogXFxcIlxcXCIsIHNvdXJjZVVybDogXFxcIlxcXCIsIGNhdGVnb3J5OiAnb3BlbicsIGFsbG93RG93bmxvYWQ6IGZhbHNlIH0pO1xcbiAgICBhbGVydChcXFwi2KrZhSDYp9mE2K3Zgdi4IVxcXCIpO1xcbiAgfTtcXG5cXG4gIGNvbnN0IHNhdmVQbGFuID0gYXN5bmMgKCkgPT4ge1xcbiAgICBpZiAoIW5ld1BsYW4ubmFtZSB8fCAhbmV3UGxhbi5wcmljZSkgcmV0dXJuO1xcbiAgICBpZiAoZWRpdGluZ1BsYW5JZCkge1xcbiAgICAgIGF3YWl0IHVwZGF0ZURvYyhkb2MoZGIsICdzdWJzY3JpcHRpb25fcGxhbnMnLCBlZGl0aW5nUGxhbklkKSwgeyAuLi5uZXdQbGFuIH0pO1xcbiAgICAgIHNldEVkaXRpbmdQbGFuSWQobnVsbCk7XFxuICAgIH0gZWxzZSB7XFxuICAgICAgYXdhaXQgYWRkRG9jKGNvbGxlY3Rpb24oZGIsICdzdWJzY3JpcHRpb25fcGxhbnMnKSwgeyAuLi5uZXdQbGFuLCBjcmVhdGVkQXQ6IERhdGUubm93KCkgfSk7XFxuICAgIH1cXG4gICAgc2V0TmV3UGxhbih7IG5hbWU6IFxcXCJcXFwiLCBwcmljZTogMCwgd2hhdHNhcHA6IFxcXCJcXFwiLCBkdXJhdGlvbjogMzAsIHVuaXQ6ICdkYXlzJyB9KTtcXG4gICAgYWxlcnQoXFxcItiq2YUg2KfZhNit2YHYuCFcXFwiKTtcXG4gIH07XFxuXFxuICBjb25zdCBzYXZlU2Vhc29uID0gYXN5bmMgKCkgPT4ge1xcbiAgICBpZiAoIW5ld1NlYXNvbi50aXRsZSB8fCAhbmV3U2Vhc29uLnRodW1ibmFpbFVybCkgcmV0dXJuO1xcbiAgICBpZiAoZWRpdGluZ1NlYXNvbklkKSB7XFxuICAgICAgYXdhaXQgdXBkYXRlRG9jKGRvYyhkYiwgJ3NlYXNvbnMnLCBlZGl0aW5nU2Vhc29uSWQpLCB7IC4uLm5ld1NlYXNvbiB9KTtcXG4gICAgICBzZXRFZGl0aW5nU2Vhc29uSWQobnVsbCk7XFxuICAgIH0gZWxzZSB7XFxuICAgICAgYXdhaXQgYWRkRG9jKGNvbGxlY3Rpb24oZGIsICdzZWFzb25zJyksIHsgLi4ubmV3U2Vhc29uLCBjcmVhdGVkQXQ6IERhdGUubm93KCkgfSk7XFxuICAgIH1cXG4gICAgc2V0TmV3U2Vhc29uKHsgdGl0bGU6IFxcXCJcXFwiLCBkZXNjcmlwdGlvbjogXFxcIlxcXCIsIHRodW1ibmFpbFVybDogXFxcIlxcXCIsIGNhdGVnb3J5OiAnb3BlbicsIHZpZGVvSWRzOiBbXSB9KTtcXG4gICAgYWxlcnQoXFxcItiq2YUg2K3Zgdi4INin2YTZhdmI2LPZhSFcXFwiKTtcXG4gIH07XFxuXFxuICBjb25zdCBhcHByb3ZlVXNlciA9IGFzeW5jIChyZXE6IGFueSkgPT4ge1xcbiAgICBjb25zdCBwbGFuID0gcGxhbnMuZmluZCgocDogYW55KSA9PiBwLm5hbWUgPT09IHJlcS5wbGFuVHlwZSk7XFxuICAgIGlmICghcGxhbikgcmV0dXJuO1xcbiAgICBsZXQgZW5kID0gRGF0ZS5ub3coKTtcXG4gICAgY29uc3QgbXVsdCA9IHBsYW4udW5pdCA9PT0gJ21vbnRocycgPyAyNTkyMDAwMDAwIDogcGxhbi51bml0ID09PSAnZGF5cycgPyA4NjQwMDAwMCA6IHBsYW4udW5pdCA9PT0gJ2hvdXJzJyA/IDM2MDAwMDAgOiA2MDAwMDtcXG4gICAgZW5kICs9IHBsYW4uZHVyYXRpb24gKiBtdWx0O1xcbiAgICBhd2FpdCB1cGRhdGVEb2MoZG9jKGRiLCAndXNlcnMnLCByZXEudXNlcklkKSwgeyBpc1N1YnNjcmliZWQ6IHRydWUsIHN1YnNjcmlwdGlvblR5cGU6IHBsYW4ubmFtZSwgc3Vic2NyaXB0aW9uRW5kRGF0ZTogZW5kIH0pO1xcbiAgICBhd2FpdCBkZWxldGVEb2MoZG9jKGRiLCAnc3Vic2NyaXB0aW9uX3JlcXVlc3RzJywgcmVxLmlkKSk7XFxuICAgIGF3YWl0IGFkZERvYyhjb2xsZWN0aW9uKGRiLCAnbm90aWZpY2F0aW9ucycpLCB7IHRpdGxlOiBcXFwi2KrZgdi52YrZhCDYp9mE2LnZhdmE2KfZgiFcXFwiLCBtZXNzYWdlOiBg2KrZhSDYqtmB2LnZitmEINio2KfZgtipICR7cGxhbi5uYW1lfSDYqNmG2KzYp9itLiDYp9iz2KrZhdiq2Lkg2YrYpyDYqNi32YQhYCwgdGFyZ2V0SWQ6IFxcXCJob21lXFxcIiwgdGFyZ2V0VHlwZTogXFxcInBvc3RcXFwiLCB0aW1lc3RhbXA6IERhdGUubm93KCkgfSk7XFxuICB9O1xcblxcbiAgaWYgKCFpc0FkbWluKSByZXR1cm4gPGRpdiBjbGFzc05hbWU9XFxcImgtNjAgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZm9udC1ibGFjayB0ZXh0LXJlZC02MDAgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVzdCBhbmltYXRlLXNoYWtlXFxcIj5Hb2QgTW9kZSBSZXF1aXJlZDwvZGl2PjtcXG5cXG4gIHJldHVybiAoXFxuICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJtYXgtdy03eGwgbXgtYXV0byBzcGFjZS15LTEyIHBiLTMyIHB0LTQgcHgtMiBhbmltYXRlLWZhZGUtaW5cXFwiPlxcbiAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJncmlkIGdyaWQtY29scy0zIHNtOmdyaWQtY29scy00IG1kOmdyaWQtY29scy05IGdhcC0yXFxcIj5cXG4gICAgICAgIHsoWydyZXF1ZXN0cycsICdjb250ZW50JywgJ3NlYXNvbnMnLCAncGxhbnMnLCAncG9zdHMnLCAndXNlcnMnLCAnY29tbWVudHMnLCAnbm90aWZzJywgJ3NldHRpbmdzJywgJ2NvZGUnXSBhcyBjb25zdCkubWFwKGsgPT4gKFxcbiAgICAgICAgICA8YnV0dG9uIGtleT17a30gb25DbGljaz17KCkgPT4gc2V0VGFiKGspfSBjbGFzc05hbWU9e2BweS0zIHB4LTEgcm91bmRlZC14bCBmb250LWJsYWNrIHRleHQtWzlweF0gdXBwZXJjYXNlIHRyYW5zaXRpb24tYWxsIGR1cmF0aW9uLTMwMCBib3JkZXIgYm9yZGVyLXdoaXRlLzEwICR7dGFiID09PSBrID8gJ2JnLXJlZC02MDAgdGV4dC13aGl0ZSBzaGFkb3ctbGcgYm9yZGVyLXJlZC01MDAgc2NhbGUtMTA1JyA6ICdiZy1ibGFjay8yMCB0ZXh0LWdyYXktNTAwIGhvdmVyOmJnLXdoaXRlLzUnfWB9PlxcbiAgICAgICAgICAgIHtrID09PSAncmVxdWVzdHMnICYmIDxQaG9uZUNhbGwgc2l6ZT17MTJ9IGNsYXNzTmFtZT1cXFwiaW5saW5lIG1iLTEgYmxvY2sgbXgtYXV0b1xcXCIvPn1cXG4gICAgICAgICAgICB7ayA9PT0gJ2NvbnRlbnQnICYmIDxWaWRlb0ljb24gc2l6ZT17MTJ9IGNsYXNzTmFtZT1cXFwiaW5saW5lIG1iLTEgYmxvY2sgbXgtYXV0b1xcXCIvPn1cXG4gICAgICAgICAgICB7ayA9PT0gJ3BsYW5zJyAmJiA8U2hpZWxkQ2hlY2sgc2l6ZT17MTJ9IGNsYXNzTmFtZT1cXFwiaW5saW5lIG1iLTEgYmxvY2sgbXgtYXV0b1xcXCIvPn1cXG4gICAgICAgICAgICB7ayA9PT0gJ3VzZXJzJyAmJiA8VXNlckNpcmNsZSBzaXplPXsxMn0gY2xhc3NOYW1lPVxcXCJpbmxpbmUgbWItMSBibG9jayBteC1hdXRvXFxcIi8+fVxcbiAgICAgICAgICAgIHtrID09PSAncG9zdHMnICYmIDxOZXdzcGFwZXIgc2l6ZT17MTJ9IGNsYXNzTmFtZT1cXFwiaW5saW5lIG1iLTEgYmxvY2sgbXgtYXV0b1xcXCIvPn1cXG4gICAgICAgICAgICB7ayA9PT0gJ2NvbW1lbnRzJyAmJiA8TWVzc2FnZVNxdWFyZSBzaXplPXsxMn0gY2xhc3NOYW1lPVxcXCJpbmxpbmUgbWItMSBibG9jayBteC1hdXRvXFxcIi8+fVxcbiAgICAgICAgICAgIHtrID09PSAnbm90aWZzJyAmJiA8QmVsbCBzaXplPXsxMn0gY2xhc3NOYW1lPVxcXCJpbmxpbmUgbWItMSBibG9jayBteC1hdXRvXFxcIi8+fVxcbiAgICAgICAgICAgIHtrID09PSAnc2Vhc29ucycgJiYgPExheWVycyBzaXplPXsxMn0gY2xhc3NOYW1lPVxcXCJpbmxpbmUgbWItMSBibG9jayBteC1hdXRvXFxcIi8+fVxcbiAgICAgICAgICAgIHtrID09PSAnc2V0dGluZ3MnICYmIDxTZXR0aW5ncyBzaXplPXsxMn0gY2xhc3NOYW1lPVxcXCJpbmxpbmUgbWItMSBibG9jayBteC1hdXRvXFxcIi8+fVxcbiAgICAgICAgICAgIHtrID09PSAnY29kZScgJiYgPEVkaXQzIHNpemU9ezEyfSBjbGFzc05hbWU9XFxcImlubGluZSBtYi0xIGJsb2NrIG14LWF1dG9cXFwiLz59XFxuICAgICAgICAgICAge3RbYCR7a31UYWJgXSB8fCBrfVxcbiAgICAgICAgICA8L2J1dHRvbj5cXG4gICAgICAgICkpfVxcbiAgICAgIDwvZGl2PlxcblxcbiAgICAgIHt0YWIgPT09ICdyZXF1ZXN0cycgJiYgKFxcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImdyaWQgZ2FwLTRcXFwiPlxcbiAgICAgICAgICA8aDIgY2xhc3NOYW1lPVxcXCJ0ZXh0LXhsIGZvbnQtYmxhY2sgdXBwZXJjYXNlIHRleHQtd2hpdGUgbWItNCBib3JkZXItci00IGJvcmRlci1yZWQtNjAwIHByLTRcXFwiPnt0LnJlcXVlc3RzVGFifTwvaDI+XFxuICAgICAgICAgIHtyZXFzLmxlbmd0aCA9PT0gMCA/IChcXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwicC0xMCB0ZXh0LWNlbnRlciBvcGFjaXR5LTMwIGZvbnQtYmxhY2sgdGV4dC14cyB1cHBlcmNhc2VcXFwiPnt0Lm5vUmVxdWVzdHN9PC9kaXY+XFxuICAgICAgICAgICkgOiByZXFzLm1hcChyID0+IChcXG4gICAgICAgICAgICA8ZGl2IGtleT17ci5pZH0gY2xhc3NOYW1lPVxcXCJiZy13aGl0ZS81IGJvcmRlciBib3JkZXItd2hpdGUvMTAgcC01IHJvdW5kZWQtM3hsIGZsZXggZmxleC1jb2wgc206ZmxleC1yb3cganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBnYXAtNFxcXCI+XFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwidGV4dC1jZW50ZXIgc206dGV4dC1yaWdodFxcXCI+XFxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cXFwiZm9udC1ibGFjayB0ZXh0LXdoaXRlIHRleHQtbGdcXFwiPntyLnVzZXJOYW1lfTwvcD5cXG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVxcXCJ0ZXh0LXJlZC01MDAgdGV4dC1bMTBweF0gZm9udC1ibGFjayB1cHBlcmNhc2VcXFwiPntyLnBsYW5UeXBlfTwvcD5cXG4gICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggZ2FwLTJcXFwiPlxcbiAgICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IGFwcHJvdmVVc2VyKHIpfSBjbGFzc05hbWU9XFxcImJnLWdyZWVuLTYwMCBweC02IHB5LTIgcm91bmRlZC14bCB0ZXh0LVsxMHB4XSBmb250LWJsYWNrIHVwcGVyY2FzZSBzaGFkb3ctbGdcXFwiPtmF2YjYp9mB2YLYqTwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IGRlbGV0ZURvYyhkb2MoZGIsICdzdWJzY3JpcHRpb25fcmVxdWVzdHMnLCByLmlkKSl9IGNsYXNzTmFtZT1cXFwiYmctcmVkLTYwMC8yMCB0ZXh0LXJlZC02MDAgYm9yZGVyIGJvcmRlci1yZWQtNjAwLzMwIHB4LTYgcHktMiByb3VuZGVkLXhsIHRleHQtWzEwcHhdIGZvbnQtYmxhY2sgdXBwZXJjYXNlXFxcIj7YsdmB2LY8L2J1dHRvbj5cXG4gICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICApKX1cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICl9XFxuXFxuICAgICAge3RhYiA9PT0gJ3VzZXJzJyAmJiAoXFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZ3JpZCBnYXAtNFxcXCI+XFxuICAgICAgICAgIDxoMiBjbGFzc05hbWU9XFxcInRleHQteGwgZm9udC1ibGFjayB1cHBlcmNhc2UgdGV4dC13aGl0ZSBtYi00IGJvcmRlci1yLTQgYm9yZGVyLXJlZC02MDAgcHItNFxcXCI+e3QudXNlcnNUYWJ9PC9oMj5cXG4gICAgICAgICAge3VzZXJzLm1hcCh1ID0+IChcXG4gICAgICAgICAgICA8ZGl2IGtleT17dS5pZH0gY2xhc3NOYW1lPVxcXCJiZy1ibGFjay80MCBiYWNrZHJvcC1ibHVyLXhsIHAtNSByb3VuZGVkLVsycmVtXSBib3JkZXIgYm9yZGVyLXdoaXRlLzUgZmxleCBmbGV4LWNvbCBzbTpmbGV4LXJvdyBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGdhcC00IGdyb3VwIGhvdmVyOmJvcmRlci1yZWQtNjAwLzMwIHRyYW5zaXRpb24tYWxsIHNoYWRvdy14bFxcXCI+XFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTRcXFwiPlxcbiAgICAgICAgICAgICAgICA8aW1nIHNyYz17dS5waG90b1VybH0gY2xhc3NOYW1lPVxcXCJ3LTEyIGgtMTIgcm91bmRlZC14bCBib3JkZXItMiBib3JkZXItcmVkLTYwMC8yMCBvYmplY3QtY292ZXJcXFwiIC8+XFxuICAgICAgICAgICAgICAgIDxkaXY+XFxuICAgICAgICAgICAgICAgICAgPGg0IGNsYXNzTmFtZT1cXFwiZm9udC1ibGFjayB0ZXh0LXdoaXRlIHRleHQtYmFzZVxcXCI+e3UubmFtZX08L2g0PlxcbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cXFwidGV4dC1bOXB4XSB0ZXh0LXJlZC01MDAgdXBwZXJjYXNlXFxcIj57dS5pc1N1YnNjcmliZWQgPyBgJHt1LnN1YnNjcmlwdGlvblR5cGV9YCA6IHQuZnJlZX08L3A+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBnYXAtMiBmbGV4LXdyYXAganVzdGlmeS1jZW50ZXJcXFwiPlxcbiAgICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHVwZGF0ZURvYyhkb2MoZGIsICd1c2VycycsIHUuaWQpLCB7IGlzTXV0ZWQ6ICF1LmlzTXV0ZWQgfSl9IGNsYXNzTmFtZT17YHAtMiBweC00IHJvdW5kZWQtbGcgdGV4dC1bOXB4XSBmb250LWJsYWNrIHVwcGVyY2FzZSB0cmFuc2l0aW9uLWFsbCAke3UuaXNNdXRlZCA/ICdiZy1ncmF5LTYwMCB0ZXh0LXdoaXRlJyA6ICdiZy15ZWxsb3ctNjAwLzIwIHRleHQteWVsbG93LTYwMCBib3JkZXIgYm9yZGVyLXllbGxvdy02MDAvMzAnfWB9PlxcbiAgICAgICAgICAgICAgICAgICB7dS5pc011dGVkID8gdC51bm11dGUgOiB0Lm11dGV9XFxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHVwZGF0ZURvYyhkb2MoZGIsICd1c2VycycsIHUuaWQpLCB7IGlzQmFubmVkOiAhdS5pc0Jhbm5lZCB9KX0gY2xhc3NOYW1lPXtgcC0yIHB4LTQgcm91bmRlZC1sZyB0ZXh0LVs5cHhdIGZvbnQtYmxhY2sgdXBwZXJjYXNlIHRyYW5zaXRpb24tYWxsICR7dS5pc0Jhbm5lZCA/ICdiZy13aGl0ZS81IHRleHQtZ3JlZW4tNTAwJyA6ICdiZy1yZWQtNjAwLzIwIHRleHQtcmVkLTYwMCBib3JkZXIgYm9yZGVyLXJlZC02MDAvMzAnfWB9PlxcbiAgICAgICAgICAgICAgICAgICB7dS5pc0Jhbm5lZCA/IHQudW5iYW4gOiB0LmJhbn1cXG4gICAgICAgICAgICAgICAgPC9idXR0b24+XFxuICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gZGVsZXRlRG9jKGRvYyhkYiwgJ3VzZXJzJywgdS5pZCkpfSBjbGFzc05hbWU9XFxcImJnLXdoaXRlLzUgcC0yIHJvdW5kZWQtbGcgdGV4dC1ncmF5LTUwMCBob3Zlcjp0ZXh0LXJlZC02MDAgdHJhbnNpdGlvbi1hbGxcXFwiPlxcbiAgICAgICAgICAgICAgICAgICA8VHJhc2gyIHNpemU9ezE2fS8+XFxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICkpfVxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgKX1cXG5cXG4gICAgICB7dGFiID09PSAnY29udGVudCcgJiYgKFxcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInNwYWNlLXktMTZcXFwiPlxcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZ3JpZCBtZDpncmlkLWNvbHMtMiBnYXAtMTBcXFwiPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJnbGFzcy1lZmZlY3QgcC02IHNtOnAtOCByb3VuZGVkLVsyLjVyZW1dIHNwYWNlLXktNlxcXCI+XFxuICAgICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVxcXCJ0ZXh0LXhsIGZvbnQtYmxhY2sgdGV4dC13aGl0ZSBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBib3JkZXItYiBib3JkZXItd2hpdGUvMTAgcGItNFxcXCI+PFZpZGVvSWNvbiBjbGFzc05hbWU9XFxcInRleHQtcmVkLTYwMFxcXCIvPiB7ZWRpdGluZ1ZpZElkID8gXFxcItiq2LnYr9mK2YQg2YHZitiv2YrZiFxcXCIgOiBcXFwi2KXYttin2YHYqSDZgdmK2K/ZitmIINis2K/ZitivXFxcIn08L2gzPlxcbiAgICAgICAgICAgICAgPGlucHV0IHBsYWNlaG9sZGVyPVxcXCLYp9mE2LnZhtmI2KfZhlxcXCIgdmFsdWU9e25ld1ZpZC50aXRsZX0gb25DaGFuZ2U9e2UgPT4gc2V0TmV3VmlkKHsuLi5uZXdWaWQsIHRpdGxlOiBlLnRhcmdldC52YWx1ZX0pfSBjbGFzc05hbWU9XFxcInctZnVsbCBiZy13aGl0ZS81IGJvcmRlciBib3JkZXItd2hpdGUvMTAgcC0zIHJvdW5kZWQteGwgdGV4dC13aGl0ZSB0ZXh0LXhzIG91dGxpbmUtbm9uZVxcXCIgLz5cXG4gICAgICAgICAgICAgIDx0ZXh0YXJlYSBwbGFjZWhvbGRlcj1cXFwi2KfZhNmI2LXZgVxcXCIgdmFsdWU9e25ld1ZpZC5kZXNjcmlwdGlvbn0gb25DaGFuZ2U9e2UgPT4gc2V0TmV3VmlkKHsuLi5uZXdWaWQsIGRlc2NyaXB0aW9uOiBlLnRhcmdldC52YWx1ZX0pfSBjbGFzc05hbWU9XFxcInctZnVsbCBiZy13aGl0ZS81IGJvcmRlciBib3JkZXItd2hpdGUvMTAgcC0zIHJvdW5kZWQteGwgaC0yMCB0ZXh0LXdoaXRlIHRleHQteHMgb3V0bGluZS1ub25lXFxcIiAvPlxcbiAgICAgICAgICAgICAgPEZpbGVJbnB1dCBsYWJlbD1cXFwi2KfZhNmB2YrYr9mK2YggKFlvdVR1YmUvRXh0ZXJuYWwpXFxcIiBwbGFjZWhvbGRlcj1cXFwi2LHYp9io2Lcg2KfZhNmB2YrYr9mK2YhcXFwiIHZhbHVlPXtuZXdWaWQudmlkZW9Vcmx9IG9uVmFsdWVDaGFuZ2U9eyh2YWwpID0+IHNldE5ld1ZpZCh7Li4ubmV3VmlkLCB2aWRlb1VybDogdmFsfSl9IC8+XFxuICAgICAgICAgICAgICA8RmlsZUlucHV0IGxhYmVsPVxcXCLYp9mE2LXZiNix2Kkg2KfZhNmF2LXYutix2KlcXFwiIHBsYWNlaG9sZGVyPVxcXCLYsdin2KjYtyDYp9mE2LXZiNix2KlcXFwiIHZhbHVlPXtuZXdWaWQudGh1bWJuYWlsVXJsfSBvblZhbHVlQ2hhbmdlPXsodmFsKSA9PiBzZXROZXdWaWQoey4uLm5ld1ZpZCwgdGh1bWJuYWlsVXJsOiB2YWx9KX0gLz5cXG4gICAgICAgICAgICAgIDxpbnB1dCBwbGFjZWhvbGRlcj17dC5zb3VyY2VVcmx9IHZhbHVlPXtuZXdWaWQuc291cmNlVXJsfSBvbkNoYW5nZT17ZSA9PiBzZXROZXdWaWQoey4uLm5ld1ZpZCwgc291cmNlVXJsOiBlLnRhcmdldC52YWx1ZX0pfSBjbGFzc05hbWU9XFxcInctZnVsbCBiZy13aGl0ZS81IGJvcmRlciBib3JkZXItd2hpdGUvMTAgcC0zIHJvdW5kZWQteGwgdGV4dC13aGl0ZSB0ZXh0LXhzXFxcIiAvPlxcbiAgICAgICAgICAgICAgPHNlbGVjdCB2YWx1ZT17bmV3VmlkLmNhdGVnb3J5fSBvbkNoYW5nZT17ZSA9PiBzZXROZXdWaWQoey4uLm5ld1ZpZCwgY2F0ZWdvcnk6IGUudGFyZ2V0LnZhbHVlIGFzIGFueX0pfSBjbGFzc05hbWU9XFxcInctZnVsbCBiZy1ibGFjayBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHAtMyByb3VuZGVkLXhsIHRleHQtd2hpdGUgdGV4dC14c1xcXCI+XFxuICAgICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIm9wZW5cXFwiPtmF2KrYp9itINmE2YTYrNmF2YrYuTwvb3B0aW9uPlxcbiAgICAgICAgICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCJzdXBlclxcXCI+2K7Yp9i1INio2KfZhNmG2K7YqNipPC9vcHRpb24+XFxuICAgICAgICAgICAgICA8L3NlbGVjdD5cXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBweC0yXFxcIj5cXG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBjaGVja2VkPXtuZXdWaWQuYWxsb3dEb3dubG9hZH0gb25DaGFuZ2U9e2UgPT4gc2V0TmV3VmlkKHsuLi5uZXdWaWQsIGFsbG93RG93bmxvYWQ6IGUudGFyZ2V0LmNoZWNrZWR9KX0gY2xhc3NOYW1lPVxcXCJhY2NlbnQtcmVkLTYwMFxcXCIgLz5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVxcXCJ0ZXh0LXhzIHRleHQtZ3JheS00MDBcXFwiPnt0LmFsbG93RG93bmxvYWR9PC9zcGFuPlxcbiAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBnYXAtMlxcXCI+XFxuICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17c2F2ZVZpZGVvfSBjbGFzc05hbWU9XFxcImZsZXgtMSBiZy1yZWQtNjAwIHB5LTMgcm91bmRlZC14bCBmb250LWJsYWNrIHVwcGVyY2FzZSB0ZXh0LVsxMHB4XSBzaGFkb3ctbGcgc2hhZG93LXJlZC02MDAvMjAgdGV4dC13aGl0ZVxcXCI+e2VkaXRpbmdWaWRJZCA/IFxcXCLYrdmB2Lgg2KfZhNiq2LnYr9mK2YTYp9iqXFxcIiA6IFxcXCLYpdi22KfZgdipINmB2YrYr9mK2YhcXFwifTwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICB7ZWRpdGluZ1ZpZElkICYmIDxidXR0b24gb25DbGljaz17KCkgPT4geyBzZXRFZGl0aW5nVmlkSWQobnVsbCk7IHNldE5ld1ZpZCh7IHRpdGxlOiBcXFwiXFxcIiwgZGVzY3JpcHRpb246IFxcXCJcXFwiLCB0aHVtYm5haWxVcmw6IFxcXCJcXFwiLCB2aWRlb1VybDogXFxcIlxcXCIsIHNvdXJjZVVybDogXFxcIlxcXCIsIGNhdGVnb3J5OiAnb3BlbicsIGFsbG93RG93bmxvYWQ6IGZhbHNlIH0pOyB9fSBjbGFzc05hbWU9XFxcImJnLXdoaXRlLzEwIHB4LTQgcm91bmRlZC14bCB0ZXh0LVsxMHB4XSBmb250LWJsYWNrIHVwcGVyY2FzZSB0ZXh0LXdoaXRlXFxcIj7YpdmE2LrYp9ihPC9idXR0b24+fVxcbiAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImdsYXNzLWVmZmVjdCBwLTYgc206cC04IHJvdW5kZWQtWzIuNXJlbV0gc3BhY2UteS02XFxcIj5cXG4gICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XFxcInRleHQteGwgZm9udC1ibGFjayB0ZXh0LXdoaXRlIGZsZXggaXRlbXMtY2VudGVyIGdhcC0zIGJvcmRlci1iIGJvcmRlci13aGl0ZS8xMCBwYi00XFxcIj48Qm9va09wZW4gY2xhc3NOYW1lPVxcXCJ0ZXh0LXJlZC02MDBcXFwiLz4ge2VkaXRpbmdCb29rSWQgPyBcXFwi2KrYudiv2YrZhCDYsdmI2KfZitipXFxcIiA6IFxcXCLYpdi22KfZgdipINix2YjYp9mK2Kkg2KzYr9mK2K/YqVxcXCJ9PC9oMz5cXG4gICAgICAgICAgICAgIDxpbnB1dCBwbGFjZWhvbGRlcj1cXFwi2KfZhNi52YbZiNin2YZcXFwiIHZhbHVlPXtuZXdCb29rLnRpdGxlfSBvbkNoYW5nZT17ZSA9PiBzZXROZXdCb29rKHsuLi5uZXdCb29rLCB0aXRsZTogZS50YXJnZXQudmFsdWV9KX0gY2xhc3NOYW1lPVxcXCJ3LWZ1bGwgYmctd2hpdGUvNSBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHAtMyByb3VuZGVkLXhsIHRleHQtd2hpdGUgdGV4dC14cyBvdXRsaW5lLW5vbmVcXFwiIC8+XFxuICAgICAgICAgICAgICA8dGV4dGFyZWEgcGxhY2Vob2xkZXI9XFxcItin2YTZiNi12YFcXFwiIHZhbHVlPXtuZXdCb29rLmRlc2NyaXB0aW9ufSBvbkNoYW5nZT17ZSA9PiBzZXROZXdCb29rKHsuLi5uZXdCb29rLCBkZXNjcmlwdGlvbjogZS50YXJnZXQudmFsdWV9KX0gY2xhc3NOYW1lPVxcXCJ3LWZ1bGwgYmctd2hpdGUvNSBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHAtMyByb3VuZGVkLXhsIGgtMjAgdGV4dC13aGl0ZSB0ZXh0LXhzIG91dGxpbmUtbm9uZVxcXCIgLz5cXG4gICAgICAgICAgICAgIDxGaWxlSW5wdXQgbGFiZWw9XFxcItin2YTYsdmI2KfZitipIChHb29nbGUgRHJpdmUvUERGKVxcXCIgcGxhY2Vob2xkZXI9XFxcItix2KfYqNi3INin2YTYsdmI2KfZitipXFxcIiB2YWx1ZT17bmV3Qm9vay5ib29rVXJsfSBvblZhbHVlQ2hhbmdlPXsodmFsKSA9PiBzZXROZXdCb29rKHsuLi5uZXdCb29rLCBib29rVXJsOiB2YWx9KX0gLz5cXG4gICAgICAgICAgICAgIDxGaWxlSW5wdXQgbGFiZWw9XFxcItin2YTYtdmI2LHYqSDYp9mE2YXYtdi62LHYqVxcXCIgcGxhY2Vob2xkZXI9XFxcItix2KfYqNi3INin2YTYtdmI2LHYqVxcXCIgdmFsdWU9e25ld0Jvb2sudGh1bWJuYWlsVXJsfSBvblZhbHVlQ2hhbmdlPXsodmFsKSA9PiBzZXROZXdCb29rKHsuLi5uZXdCb29rLCB0aHVtYm5haWxVcmw6IHZhbH0pfSAvPlxcbiAgICAgICAgICAgICAgPGlucHV0IHBsYWNlaG9sZGVyPXt0LnNvdXJjZVVybH0gdmFsdWU9e25ld0Jvb2suc291cmNlVXJsfSBvbkNoYW5nZT17ZSA9PiBzZXROZXdCb29rKHsuLi5uZXdCb29rLCBzb3VyY2VVcmw6IGUudGFyZ2V0LnZhbHVlfSl9IGNsYXNzTmFtZT1cXFwidy1mdWxsIGJnLXdoaXRlLzUgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBwLTMgcm91bmRlZC14bCB0ZXh0LXdoaXRlIHRleHQteHNcXFwiIC8+XFxuICAgICAgICAgICAgICA8c2VsZWN0IHZhbHVlPXtuZXdCb29rLmNhdGVnb3J5fSBvbkNoYW5nZT17ZSA9PiBzZXROZXdCb29rKHsuLi5uZXdCb29rLCBjYXRlZ29yeTogZS50YXJnZXQudmFsdWUgYXMgYW55fSl9IGNsYXNzTmFtZT1cXFwidy1mdWxsIGJnLWJsYWNrIGJvcmRlciBib3JkZXItd2hpdGUvMTAgcC0zIHJvdW5kZWQteGwgdGV4dC13aGl0ZSB0ZXh0LXhzXFxcIj5cXG4gICAgICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwib3BlblxcXCI+2YXYqtin2K0g2YTZhNis2YXZiti5PC9vcHRpb24+XFxuICAgICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XFxcInN1cGVyXFxcIj7Yrtin2LUg2KjYp9mE2YbYrtio2Kk8L29wdGlvbj5cXG4gICAgICAgICAgICAgIDwvc2VsZWN0PlxcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHB4LTJcXFwiPlxcbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGNoZWNrZWQ9e25ld0Jvb2suYWxsb3dEb3dubG9hZH0gb25DaGFuZ2U9e2UgPT4gc2V0TmV3Qm9vayh7Li4ubmV3Qm9vaywgYWxsb3dEb3dubG9hZDogZS50YXJnZXQuY2hlY2tlZH0pfSBjbGFzc05hbWU9XFxcImFjY2VudC1yZWQtNjAwXFxcIiAvPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XFxcInRleHQteHMgdGV4dC1ncmF5LTQwMFxcXCI+e3QuYWxsb3dEb3dubG9hZH08L3NwYW4+XFxuICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGdhcC0yXFxcIj5cXG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXtzYXZlQm9va30gY2xhc3NOYW1lPVxcXCJmbGV4LTEgYmctcmVkLTYwMCBweS0zIHJvdW5kZWQteGwgZm9udC1ibGFjayB1cHBlcmNhc2UgdGV4dC1bMTBweF0gc2hhZG93LWxnIHNoYWRvdy1yZWQtNjAwLzIwIHRleHQtd2hpdGVcXFwiPntlZGl0aW5nQm9va0lkID8gXFxcItit2YHYuCDYp9mE2KrYudiv2YrZhNin2KpcXFwiIDogXFxcItil2LbYp9mB2Kkg2LHZiNin2YrYqVxcXCJ9PC9idXR0b24+XFxuICAgICAgICAgICAgICAgIHtlZGl0aW5nQm9va0lkICYmIDxidXR0b24gb25DbGljaz17KCkgPT4geyBzZXRFZGl0aW5nQm9va0lkKG51bGwpOyBzZXROZXdCb29rKHsgdGl0bGU6IFxcXCJcXFwiLCBkZXNjcmlwdGlvbjogXFxcIlxcXCIsIHRodW1ibmFpbFVybDogXFxcIlxcXCIsIGJvb2tVcmw6IFxcXCJcXFwiLCBzb3VyY2VVcmw6IFxcXCJcXFwiLCBjYXRlZ29yeTogJ29wZW4nLCBhbGxvd0Rvd25sb2FkOiBmYWxzZSB9KTsgfX0gY2xhc3NOYW1lPVxcXCJiZy13aGl0ZS8xMCBweC00IHJvdW5kZWQteGwgdGV4dC1bMTBweF0gZm9udC1ibGFjayB1cHBlcmNhc2UgdGV4dC13aGl0ZVxcXCI+2KXZhNi62KfYoTwvYnV0dG9uPn1cXG4gICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInNwYWNlLXktOFxcXCI+XFxuICAgICAgICAgICAgPGgzIGNsYXNzTmFtZT1cXFwidGV4dC14bCBmb250LWJsYWNrIHVwcGVyY2FzZSBib3JkZXItci00IGJvcmRlci1yZWQtNjAwIHByLTQgdGV4dC13aGl0ZVxcXCI+2KXYr9in2LHYqSDYp9mE2YXYrdiq2YjZiSDYp9mE2K3Yp9mE2Yo8L2gzPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJncmlkIGdyaWQtY29scy0yIHNtOmdyaWQtY29scy0yIGxnOmdyaWQtY29scy0zIGdhcC00XFxcIj5cXG4gICAgICAgICAgICAgIHtbLi4udmlkZW9zLCAuLi5ib29rc10ubWFwKChpdGVtOiBhbnkpID0+IChcXG4gICAgICAgICAgICAgICAgPGRpdiBrZXk9e2l0ZW0uaWR9IGNsYXNzTmFtZT1cXFwiYmctd2hpdGUvNSBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHAtNCByb3VuZGVkLTJ4bCBmbGV4IGZsZXgtY29sIGp1c3RpZnktYmV0d2VlbiBncm91cFxcXCI+XFxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIG92ZXJmbG93LWhpZGRlbiBtYi0zXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxpbWcgc3JjPXtpdGVtLnRodW1ibmFpbFVybCB8fCBMT0dPX1VSTH0gY2xhc3NOYW1lPVxcXCJ3LTEwIGgtMTAgcm91bmRlZC1sZyBvYmplY3QtY292ZXIgYm9yZGVyIGJvcmRlci13aGl0ZS8xMFxcXCIgLz5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cXFwidGV4dC1bMTBweF0gZm9udC1ibGFjayB0ZXh0LXdoaXRlIHRydW5jYXRlXFxcIj57aXRlbS50aXRsZX08L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggZ2FwLTEganVzdGlmeS1lbmRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiB7XFxuICAgICAgICAgICAgICAgICAgICAgIGlmICgndmlkZW9VcmwnIGluIGl0ZW0pIHtcXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRFZGl0aW5nVmlkSWQoaXRlbS5pZCk7XFxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0TmV3VmlkKHsuLi5pdGVtfSk7XFxuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XFxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0RWRpdGluZ0Jvb2tJZChpdGVtLmlkKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXROZXdCb29rKHsuLi5pdGVtfSk7XFxuICAgICAgICAgICAgICAgICAgICAgIH1cXG4gICAgICAgICAgICAgICAgICAgICAgd2luZG93LnNjcm9sbFRvKHsgdG9wOiAwLCBiZWhhdmlvcjogJ3Ntb290aCcgfSk7XFxuICAgICAgICAgICAgICAgICAgICB9fSBjbGFzc05hbWU9XFxcInAtMiB0ZXh0LWJsdWUtNTAwIGhvdmVyOmJnLWJsdWUtNTAwLzEwIHJvdW5kZWQtbGcgdHJhbnNpdGlvbi1jb2xvcnNcXFwiPjxFZGl0MyBzaXplPXsxNH0vPjwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBkZWxldGVEb2MoZG9jKGRiLCAndmlkZW9VcmwnIGluIGl0ZW0gPyAndmlkZW9zJyA6ICdib29rcycsIGl0ZW0uaWQpKX0gY2xhc3NOYW1lPVxcXCJwLTIgdGV4dC1yZWQtNTAwIGhvdmVyOmJnLXJlZC01MDAvMTAgcm91bmRlZC1sZyB0cmFuc2l0aW9uLWNvbG9yc1xcXCI+PFRyYXNoMiBzaXplPXsxNH0vPjwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICkpfVxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICl9XFxuXFxuICAgICAge3RhYiA9PT0gJ3Bvc3RzJyAmJiAoXFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwic3BhY2UteS0xMlxcXCI+XFxuICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiYmctYmxhY2svNDAgYmFja2Ryb3AtYmx1ci0zeGwgcC02IHNtOnAtMTAgcm91bmRlZC1bMi41cmVtXSBzbTpyb3VuZGVkLVs0cmVtXSBib3JkZXIgYm9yZGVyLXdoaXRlLzUgc3BhY2UteS02XFxcIj5cXG4gICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XFxcInRleHQtMnhsIGZvbnQtYmxhY2sgdGV4dC13aGl0ZSBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtM1xcXCI+PE5ld3NwYXBlciBjbGFzc05hbWU9XFxcInRleHQtcmVkLTYwMFxcXCIvPiB7ZWRpdGluZ1Bvc3RJZCA/IFxcXCLYqti52K/ZitmEINmF2YbYtNmI2LFcXFwiIDogXFxcItmG2LTYsSDYqtit2K/ZitirINmE2YTYudmF2KfZhNmC2KlcXFwifTwvaDM+XFxuICAgICAgICAgICAgICA8aW5wdXQgcGxhY2Vob2xkZXI9XFxcItin2YTYudmG2YjYp9mGXFxcIiB2YWx1ZT17bmV3UG9zdC50aXRsZX0gb25DaGFuZ2U9e2UgPT4gc2V0TmV3UG9zdCh7Li4ubmV3UG9zdCwgdGl0bGU6IGUudGFyZ2V0LnZhbHVlfSl9IGNsYXNzTmFtZT1cXFwidy1mdWxsIGJnLXdoaXRlLzUgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBwLTQgcm91bmRlZC14bCB0ZXh0LXdoaXRlIG91dGxpbmUtbm9uZSBmb250LWJvbGQgdGV4dC1zbVxcXCIgLz5cXG4gICAgICAgICAgICAgIDx0ZXh0YXJlYSBwbGFjZWhvbGRlcj1cXFwi2KfZhNmF2K3YqtmI2YlcXFwiIHZhbHVlPXtuZXdQb3N0LmNvbnRlbnR9IG9uQ2hhbmdlPXtlID0+IHNldE5ld1Bvc3Qoey4uLm5ld1Bvc3QsIGNvbnRlbnQ6IGUudGFyZ2V0LnZhbHVlfSl9IGNsYXNzTmFtZT1cXFwidy1mdWxsIGJnLXdoaXRlLzUgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBwLTQgcm91bmRlZC14bCB0ZXh0LXdoaXRlIG91dGxpbmUtbm9uZSBoLTQwIHRleHQtc21cXFwiIC8+XFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwic3BhY2UteS00XFxcIj5cXG4gICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGp1c3RpZnktYmV0d2VlbiBpdGVtcy1jZW50ZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVxcXCJ0ZXh0LVsxMHB4XSBmb250LWJsYWNrIHVwcGVyY2FzZSB0ZXh0LWdyYXktNTAwXFxcIj7Yp9mE2LXZiNixICjYrdiq2YkgMzAg2LXZiNix2KkpPC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBzZXROZXdQb3N0KHsuLi5uZXdQb3N0LCBpbWFnZXM6IFtdfSl9IGNsYXNzTmFtZT1cXFwidGV4dC1bOXB4XSB0ZXh0LXJlZC01MDAgZm9udC1ibGFjayB1cHBlcmNhc2UgdW5kZXJsaW5lXFxcIj7Ypdi52KfYr9ipINiq2LnZitmK2YY8L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImdyaWQgZ3JpZC1jb2xzLTEgc206Z3JpZC1jb2xzLTIgZ2FwLTRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInNwYWNlLXktMlxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XFxcInRleHQtWzlweF0gdGV4dC1ncmF5LTYwMCB1cHBlcmNhc2UgZm9udC1ibGFja1xcXCI+2LHZgdi5INmF2YYg2KfZhNis2YfYp9iyPC9wPlxcbiAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcImZpbGVcXFwiIG11bHRpcGxlIGFjY2VwdD1cXFwiaW1hZ2UvKlxcXCIgb25DaGFuZ2U9e2hhbmRsZVBvc3RJbWFnZXN9IGNsYXNzTmFtZT1cXFwidy1mdWxsIHRleHQtWzEwcHhdIHRleHQtZ3JheS01MDAgZmlsZTptci00IGZpbGU6cHktMiBmaWxlOnB4LTQgZmlsZTpyb3VuZGVkLWZ1bGwgZmlsZTpib3JkZXItMCBmaWxlOnRleHQtWzlweF0gZmlsZTpmb250LWJsYWNrIGZpbGU6YmctcmVkLTYwMCBmaWxlOnRleHQtd2hpdGVcXFwiIC8+XFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJzcGFjZS15LTJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVxcXCJ0ZXh0LVs5cHhdIHRleHQtZ3JheS02MDAgdXBwZXJjYXNlIGZvbnQtYmxhY2tcXFwiPtix2KfYqNi3INi12YjYsdipINiu2KfYsdis2Yo8L3A+XFxuICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBnYXAtMlxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgaWQ9XFxcInBvc3QtdXJsLWltZy1hZG1pblxcXCIgcGxhY2Vob2xkZXI9XFxcItix2KfYqNi3IFVSTFxcXCIgY2xhc3NOYW1lPVxcXCJmbGV4LTEgYmctd2hpdGUvNSBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHAtMiByb3VuZGVkLXhsIHRleHQtWzEwcHhdIHRleHQtd2hpdGVcXFwiIC8+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHsgXFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Bvc3QtdXJsLWltZy1hZG1pbicpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGlucHV0LnZhbHVlKSBzZXROZXdQb3N0KHAgPT4gKHsuLi5wLCBpbWFnZXM6IFsuLi5wLmltYWdlcywgaW5wdXQudmFsdWVdLnNsaWNlKDAsIDMwKX0pKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQudmFsdWUgPSBcXFwiXFxcIjtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH19IGNsYXNzTmFtZT1cXFwiYmctcmVkLTYwMCBwLTIgcHgtNCByb3VuZGVkLXhsIHRleHQteHMgdGV4dC13aGl0ZSBzaGFkb3ctbGdcXFwiPis8L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGdhcC0yIG92ZXJmbG93LXgtYXV0byBwYi00IHNjcm9sbGJhci1oaWRlXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIHtuZXdQb3N0LmltYWdlcy5tYXAoKGltZywgaSkgPT4gKFxcbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGtleT17aX0gY2xhc3NOYW1lPVxcXCJ3LTE2IGgtMTYgc2hyaW5rLTAgcm91bmRlZC1sZyBvdmVyZmxvdy1oaWRkZW4gYm9yZGVyIGJvcmRlci13aGl0ZS8xMCByZWxhdGl2ZSBncm91cFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGltZyBzcmM9e2ltZ30gY2xhc3NOYW1lPVxcXCJ3LWZ1bGwgaC1mdWxsIG9iamVjdC1jb3ZlclxcXCIgLz5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHNldE5ld1Bvc3QocCA9PiAoey4uLnAsIGltYWdlczogcC5pbWFnZXMuZmlsdGVyKChfLCBpZHgpID0+IGlkeCAhPT0gaSl9KSl9IGNsYXNzTmFtZT1cXFwiYWJzb2x1dGUgaW5zZXQtMCBiZy1yZWQtNjAwLzgwIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBoaWRkZW4gZ3JvdXAtaG92ZXI6ZmxleFxcXCI+PFggc2l6ZT17MTJ9Lz48L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICApKX1cXG4gICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICA8aW5wdXQgcGxhY2Vob2xkZXI9e3Quc291cmNlVXJsfSB2YWx1ZT17bmV3UG9zdC5zb3VyY2VVcmx9IG9uQ2hhbmdlPXtlID0+IHNldE5ld1Bvc3Qoey4uLm5ld1Bvc3QsIHNvdXJjZVVybDogZS50YXJnZXQudmFsdWV9KX0gY2xhc3NOYW1lPVxcXCJ3LWZ1bGwgYmctd2hpdGUvNSBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHAtNCByb3VuZGVkLXhsIHRleHQtd2hpdGUgb3V0bGluZS1ub25lIHRleHQteHNcXFwiIC8+XFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBnYXAtM1xcXCI+XFxuICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17c2F2ZVBvc3R9IGNsYXNzTmFtZT1cXFwiZmxleC0xIGJnLXJlZC02MDAgcHktNCByb3VuZGVkLTJ4bCBmb250LWJsYWNrIHVwcGVyY2FzZSB0ZXh0LXhzIHRyYWNraW5nLXdpZGVzdCBzaGFkb3ctMnhsIHNoYWRvdy1yZWQtNjAwLzIwIHRleHQtd2hpdGVcXFwiPntlZGl0aW5nUG9zdElkID8gXFxcItit2YHYuCDYp9mE2KrYudiv2YrZhNin2KpcXFwiIDogXFxcItmG2LTYsSDZhNmE2LnZhdin2YTZgtipXFxcIn08L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAge2VkaXRpbmdQb3N0SWQgJiYgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiB7IHNldEVkaXRpbmdQb3N0SWQobnVsbCk7IHNldE5ld1Bvc3QoeyB0aXRsZTogXFxcIlxcXCIsIGNvbnRlbnQ6IFxcXCJcXFwiLCBpbWFnZXM6IFtdLCBzb3VyY2VVcmw6IFxcXCJcXFwiIH0pOyB9fSBjbGFzc05hbWU9XFxcImJnLXdoaXRlLzEwIHB4LTYgcm91bmRlZC0yeGwgZm9udC1ibGFjayB0ZXh0LXhzIHVwcGVyY2FzZSB0ZXh0LXdoaXRlXFxcIj7YpdmE2LrYp9ihPC9idXR0b24+fVxcbiAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJzcGFjZS15LTZcXFwiPlxcbiAgICAgICAgICAgICAgPGgzIGNsYXNzTmFtZT1cXFwidGV4dC14bCBmb250LWJsYWNrIHVwcGVyY2FzZSBib3JkZXItci00IGJvcmRlci1yZWQtNjAwIHByLTQgdGV4dC13aGl0ZVxcXCI+2KXYr9in2LHYqSDYp9mE2YXZhti02YjYsdin2Kog2KfZhNiz2KfYqNmC2Kk8L2gzPlxcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImdyaWQgZ2FwLTRcXFwiPlxcbiAgICAgICAgICAgICAgICB7cG9zdHMubWFwKHAgPT4gKFxcbiAgICAgICAgICAgICAgICAgIDxkaXYga2V5PXtwLmlkfSBjbGFzc05hbWU9XFxcImJnLXdoaXRlLzUgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBwLTQgcm91bmRlZC0zeGwgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGdhcC00IGdyb3VwXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtNCBvdmVyZmxvdy1oaWRkZW5cXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICB7cC5pbWFnZXNbMF0gJiYgPGltZyBzcmM9e3AuaW1hZ2VzWzBdfSBjbGFzc05hbWU9XFxcInctMTQgaC0xNCByb3VuZGVkLXhsIG9iamVjdC1jb3ZlciBib3JkZXIgYm9yZGVyLXdoaXRlLzEwXFxcIiAvPn1cXG4gICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcIm92ZXJmbG93LWhpZGRlblxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVxcXCJmb250LWJsYWNrIHRleHQtd2hpdGUgdGV4dC1zbSB0cnVuY2F0ZVxcXCI+e3AudGl0bGV9PC9wPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cXFwidGV4dC1bOXB4XSB0ZXh0LWdyYXktNTAwIGZvbnQtYmxhY2sgdXBwZXJjYXNlXFxcIj57bmV3IERhdGUocC50aW1lc3RhbXApLnRvTG9jYWxlRGF0ZVN0cmluZygpfTwvcD5cXG4gICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGdhcC0yXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiB7IHNldEVkaXRpbmdQb3N0SWQocC5pZCk7IHNldE5ld1Bvc3Qoey4uLnB9KTsgd2luZG93LnNjcm9sbFRvKHsgdG9wOiAwLCBiZWhhdmlvcjogJ3Ntb290aCcgfSk7IH19IGNsYXNzTmFtZT1cXFwicC0zIGJnLWJsdWUtNTAwLzEwIHRleHQtYmx1ZS01MDAgcm91bmRlZC14bCBob3ZlcjpiZy1ibHVlLTUwMCBob3Zlcjp0ZXh0LXdoaXRlIHRyYW5zaXRpb24tYWxsXFxcIj48RWRpdDMgc2l6ZT17MTZ9Lz48L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBkZWxldGVEb2MoZG9jKGRiLCAncG9zdHMnLCBwLmlkKSl9IGNsYXNzTmFtZT1cXFwicC0zIGJnLXJlZC02MDAvMTAgdGV4dC1yZWQtNjAwIHJvdW5kZWQteGwgaG92ZXI6YmctcmVkLTYwMCBob3Zlcjp0ZXh0LXdoaXRlIHRyYW5zaXRpb24tYWxsXFxcIj48VHJhc2gyIHNpemU9ezE2fS8+PC9idXR0b24+XFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgKSl9XFxuICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgKX1cXG5cXG4gICAgICB7dGFiID09PSAncGxhbnMnICYmIChcXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJzcGFjZS15LTEyXFxcIj5cXG4gICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJiZy13aGl0ZS81IHAtNiBzbTpwLTEwIHJvdW5kZWQtWzIuNXJlbV0gYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBzcGFjZS15LTZcXFwiPlxcbiAgICAgICAgICAgICAgPGgzIGNsYXNzTmFtZT1cXFwidGV4dC14bCBmb250LWJsYWNrIHVwcGVyY2FzZSBib3JkZXItYiBib3JkZXItd2hpdGUvMTAgcGItNCB0ZXh0LXdoaXRlXFxcIj57ZWRpdGluZ1BsYW5JZCA/IFxcXCLYqti52K/ZitmEINio2KfZgtipXFxcIiA6IFxcXCLYpdi22KfZgdipINio2KfZgtipINis2K/Zitiv2KlcXFwifTwvaDM+XFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZ3JpZCBzbTpncmlkLWNvbHMtMiBnYXAtNFxcXCI+XFxuICAgICAgICAgICAgICAgIDxpbnB1dCBwbGFjZWhvbGRlcj1cXFwi2KfYs9mFINin2YTYqNin2YLYqVxcXCIgdmFsdWU9e25ld1BsYW4ubmFtZX0gb25DaGFuZ2U9e2UgPT4gc2V0TmV3UGxhbih7Li4ubmV3UGxhbiwgbmFtZTogZS50YXJnZXQudmFsdWV9KX0gY2xhc3NOYW1lPVxcXCJiZy1ibGFjay80MCBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHAtNCByb3VuZGVkLXhsIHRleHQtd2hpdGUgdGV4dC14cyBvdXRsaW5lLW5vbmVcXFwiIC8+XFxuICAgICAgICAgICAgICAgIDxpbnB1dCBwbGFjZWhvbGRlcj1cXFwi2KfZhNiz2LnYsVxcXCIgdHlwZT1cXFwibnVtYmVyXFxcIiB2YWx1ZT17bmV3UGxhbi5wcmljZX0gb25DaGFuZ2U9e2UgPT4gc2V0TmV3UGxhbih7Li4ubmV3UGxhbiwgcHJpY2U6IE51bWJlcihlLnRhcmdldC52YWx1ZSl9KX0gY2xhc3NOYW1lPVxcXCJiZy1ibGFjay80MCBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHAtNCByb3VuZGVkLXhsIHRleHQtd2hpdGUgdGV4dC14cyBvdXRsaW5lLW5vbmVcXFwiIC8+XFxuICAgICAgICAgICAgICAgIDxpbnB1dCBwbGFjZWhvbGRlcj1cXFwi2KfZhNmF2K/YqSAo2LHZgtmFKVxcXCIgdHlwZT1cXFwibnVtYmVyXFxcIiB2YWx1ZT17bmV3UGxhbi5kdXJhdGlvbn0gb25DaGFuZ2U9e2UgPT4gc2V0TmV3UGxhbih7Li4ubmV3UGxhbiwgZHVyYXRpb246IE51bWJlcihlLnRhcmdldC52YWx1ZSl9KX0gY2xhc3NOYW1lPVxcXCJiZy1ibGFjay80MCBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHAtNCByb3VuZGVkLXhsIHRleHQtd2hpdGUgdGV4dC14cyBvdXRsaW5lLW5vbmVcXFwiIC8+XFxuICAgICAgICAgICAgICAgIDxzZWxlY3QgdmFsdWU9e25ld1BsYW4udW5pdH0gb25DaGFuZ2U9e2UgPT4gc2V0TmV3UGxhbih7Li4ubmV3UGxhbiwgdW5pdDogZS50YXJnZXQudmFsdWUgYXMgYW55fSl9IGNsYXNzTmFtZT1cXFwiYmctYmxhY2svNDAgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBwLTQgcm91bmRlZC14bCB0ZXh0LXdoaXRlIHRleHQteHNcXFwiPlxcbiAgICAgICAgICAgICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCJtaW51dGVzXFxcIj7Yr9mC2KfYptmCPC9vcHRpb24+XFxuICAgICAgICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XFxcImhvdXJzXFxcIj7Ys9in2LnYp9iqPC9vcHRpb24+XFxuICAgICAgICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XFxcImRheXNcXFwiPtij2YrYp9mFPC9vcHRpb24+XFxuICAgICAgICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIm1vbnRoc1xcXCI+2KPYtNmH2LE8L29wdGlvbj5cXG4gICAgICAgICAgICAgICAgPC9zZWxlY3Q+XFxuICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgIDxpbnB1dCBwbGFjZWhvbGRlcj1cXFwi2LHZgtmFINmI2KfYqtiz2KfYqCDYp9mE2K/Zgdi5XFxcIiB2YWx1ZT17bmV3UGxhbi53aGF0c2FwcH0gb25DaGFuZ2U9e2UgPT4gc2V0TmV3UGxhbih7Li4ubmV3UGxhbiwgd2hhdHNhcHA6IGUudGFyZ2V0LnZhbHVlfSl9IGNsYXNzTmFtZT1cXFwidy1mdWxsIGJnLWJsYWNrLzQwIGJvcmRlciBib3JkZXItd2hpdGUvMTAgcC00IHJvdW5kZWQteGwgdGV4dC13aGl0ZSB0ZXh0LXhzIG91dGxpbmUtbm9uZVxcXCIgLz5cXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGdhcC0yXFxcIj5cXG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXtzYXZlUGxhbn0gY2xhc3NOYW1lPVxcXCJmbGV4LTEgYmctcmVkLTYwMCBwLTQgcm91bmRlZC14bCBmb250LWJsYWNrIHVwcGVyY2FzZSB0ZXh0LXhzIHNoYWRvdy14bCB0ZXh0LXdoaXRlXFxcIj57ZWRpdGluZ1BsYW5JZCA/IFxcXCLYrdmB2Lgg2KfZhNiq2LnYr9mK2YTYp9iqXFxcIiA6IFxcXCLYrdmB2Lgg2KfZhNio2KfZgtipXFxcIn08L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAge2VkaXRpbmdQbGFuSWQgJiYgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiB7IHNldEVkaXRpbmdQbGFuSWQobnVsbCk7IHNldE5ld1BsYW4oeyBuYW1lOiBcXFwiXFxcIiwgcHJpY2U6IDAsIHdoYXRzYXBwOiBcXFwiXFxcIiwgZHVyYXRpb246IDMwLCB1bml0OiAnZGF5cycgfSk7IH19IGNsYXNzTmFtZT1cXFwiYmctd2hpdGUvMTAgcHgtNiByb3VuZGVkLXhsIGZvbnQtYmxhY2sgdGV4dC14cyB1cHBlcmNhc2UgdGV4dC13aGl0ZVxcXCI+2KXZhNi62KfYoTwvYnV0dG9uPn1cXG4gICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwic3BhY2UteS02XFxcIj5cXG4gICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XFxcInRleHQteGwgZm9udC1ibGFjayB1cHBlcmNhc2UgYm9yZGVyLXItNCBib3JkZXItcmVkLTYwMCBwci00IHRleHQtd2hpdGVcXFwiPtil2K/Yp9ix2Kkg2KfZhNio2KfZgtin2Kog2KfZhNit2KfZhNmK2Kk8L2gzPlxcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImdyaWQgZ3JpZC1jb2xzLTIgc206Z3JpZC1jb2xzLTIgbGc6Z3JpZC1jb2xzLTMgZ2FwLTRcXFwiPlxcbiAgICAgICAgICAgICAgICB7cGxhbnMubWFwKHAgPT4gKFxcbiAgICAgICAgICAgICAgICAgIDxkaXYga2V5PXtwLmlkfSBjbGFzc05hbWU9XFxcImJnLXdoaXRlLzUgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBwLTUgcm91bmRlZC0zeGwgZmxleCBmbGV4LWNvbCBqdXN0aWZ5LWJldHdlZW4gZ2FwLTQgZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcIm92ZXJmbG93LWhpZGRlblxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cXFwiZm9udC1ibGFjayB0ZXh0LXdoaXRlIHRleHQtc20gdHJ1bmNhdGVcXFwiPntwLm5hbWV9PC9wPlxcbiAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XFxcInRleHQtcmVkLTUwMCB0ZXh0LVs5cHhdIGZvbnQtYmxhY2sgdXBwZXJjYXNlXFxcIj57cC5wcmljZX0ge3QubGV9IC8ge3AuZHVyYXRpb259IHt0W3AudW5pdF0gfHwgcC51bml0fTwvcD5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggZ2FwLTEganVzdGlmeS1lbmRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHsgc2V0RWRpdGluZ1BsYW5JZChwLmlkKTsgc2V0TmV3UGxhbih7Li4ucH0pOyB3aW5kb3cuc2Nyb2xsVG8oeyB0b3A6IDAsIGJlaGF2aW9yOiAnc21vb3RoJyB9KTsgfX0gY2xhc3NOYW1lPVxcXCJwLTIgdGV4dC1ibHVlLTUwMCBob3ZlcjpiZy1ibHVlLTUwMC8xMCByb3VuZGVkLWxnIHRyYW5zaXRpb24tYWxsXFxcIj48RWRpdDMgc2l6ZT17MTZ9Lz48L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBkZWxldGVEb2MoZG9jKGRiLCAnc3Vic2NyaXB0aW9uX3BsYW5zJywgcC5pZCkpfSBjbGFzc05hbWU9XFxcInAtMiB0ZXh0LXJlZC01MDAgaG92ZXI6YmctcmVkLTUwMC8xMCByb3VuZGVkLWxnIHRyYW5zaXRpb24tYWxsXFxcIj48VHJhc2gyIHNpemU9ezE2fS8+PC9idXR0b24+XFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgKSl9XFxuICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgKX1cXG5cXG4gICAgICB7dGFiID09PSAnc2Vhc29ucycgJiYgKFxcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInNwYWNlLXktMTJcXFwiPlxcbiAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImdsYXNzLWVmZmVjdCBwLTYgc206cC0xMCByb3VuZGVkLVsyLjVyZW1dIGJvcmRlciBib3JkZXItd2hpdGUvMTAgc3BhY2UteS02XFxcIj5cXG4gICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XFxcInRleHQteGwgZm9udC1ibGFjayB0ZXh0LXdoaXRlIGZsZXggaXRlbXMtY2VudGVyIGdhcC0zIGJvcmRlci1iIGJvcmRlci13aGl0ZS8xMCBwYi00XFxcIj48TGF5ZXJzIGNsYXNzTmFtZT1cXFwidGV4dC1yZWQtNjAwXFxcIi8+IHtlZGl0aW5nU2Vhc29uSWQgPyBcXFwi2KrYudiv2YrZhCDZhdmI2LPZhVxcXCIgOiBcXFwi2KXYttin2YHYqSDZhdmI2LPZhSDYrNiv2YrYr1xcXCJ9PC9oMz5cXG4gICAgICAgICAgICAgIDxpbnB1dCBwbGFjZWhvbGRlcj17dC5zZWFzb25OYW1lfSB2YWx1ZT17bmV3U2Vhc29uLnRpdGxlfSBvbkNoYW5nZT17ZSA9PiBzZXROZXdTZWFzb24oey4uLm5ld1NlYXNvbiwgdGl0bGU6IGUudGFyZ2V0LnZhbHVlfSl9IGNsYXNzTmFtZT1cXFwidy1mdWxsIGJnLXdoaXRlLzUgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBwLTMgcm91bmRlZC14bCB0ZXh0LXdoaXRlIHRleHQteHMgb3V0bGluZS1ub25lXFxcIiAvPlxcbiAgICAgICAgICAgICAgPHRleHRhcmVhIHBsYWNlaG9sZGVyPXt0LnNlYXNvbkRlc2N9IHZhbHVlPXtuZXdTZWFzb24uZGVzY3JpcHRpb259IG9uQ2hhbmdlPXtlID0+IHNldE5ld1NlYXNvbih7Li4ubmV3U2Vhc29uLCBkZXNjcmlwdGlvbjogZS50YXJnZXQudmFsdWV9KX0gY2xhc3NOYW1lPVxcXCJ3LWZ1bGwgYmctd2hpdGUvNSBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHAtMyByb3VuZGVkLXhsIGgtMjAgdGV4dC13aGl0ZSB0ZXh0LXhzIG91dGxpbmUtbm9uZVxcXCIgLz5cXG4gICAgICAgICAgICAgIDxGaWxlSW5wdXQgbGFiZWw9e3Quc2Vhc29uQ292ZXJ9IHBsYWNlaG9sZGVyPVxcXCLYsdin2KjYtyDYp9mE2LXZiNix2KlcXFwiIHZhbHVlPXtuZXdTZWFzb24udGh1bWJuYWlsVXJsfSBvblZhbHVlQ2hhbmdlPXsodmFsKSA9PiBzZXROZXdTZWFzb24oey4uLm5ld1NlYXNvbiwgdGh1bWJuYWlsVXJsOiB2YWx9KX0gLz5cXG4gICAgICAgICAgICAgIDxzZWxlY3QgdmFsdWU9e25ld1NlYXNvbi5jYXRlZ29yeX0gb25DaGFuZ2U9e2UgPT4gc2V0TmV3U2Vhc29uKHsuLi5uZXdTZWFzb24sIGNhdGVnb3J5OiBlLnRhcmdldC52YWx1ZSBhcyBhbnl9KX0gY2xhc3NOYW1lPVxcXCJ3LWZ1bGwgYmctYmxhY2sgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBwLTMgcm91bmRlZC14bCB0ZXh0LXdoaXRlIHRleHQteHNcXFwiPlxcbiAgICAgICAgICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCJvcGVuXFxcIj7Zhdiq2KfYrSDZhNmE2KzZhdmK2Lk8L29wdGlvbj5cXG4gICAgICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwic3VwZXJcXFwiPtiu2KfYtSDYqNin2YTZhtiu2KjYqTwvb3B0aW9uPlxcbiAgICAgICAgICAgICAgPC9zZWxlY3Q+XFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwic3BhY2UteS0yXFxcIj5cXG4gICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cXFwidGV4dC14cyBmb250LWJsYWNrIHVwcGVyY2FzZSB0ZXh0LWdyYXktNTAwIHB4LTJcXFwiPnt0LnNlbGVjdFZpZGVvc308L2xhYmVsPlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZ3JpZCBncmlkLWNvbHMtMiBzbTpncmlkLWNvbHMtMyBnYXAtMiBtYXgtaC00MCBvdmVyZmxvdy15LWF1dG8gcC0yIGJnLWJsYWNrLzQwIHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci13aGl0ZS81IHNjcm9sbGJhci1oaWRlXFxcIj5cXG4gICAgICAgICAgICAgICAgICB7dmlkZW9zLm1hcCh2ID0+IChcXG4gICAgICAgICAgICAgICAgICAgIDxkaXYga2V5PXt2LmlkfSBvbkNsaWNrPXsoKSA9PiB7XFxuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkcyA9IG5ld1NlYXNvbi52aWRlb0lkcy5pbmNsdWRlcyh2LmlkKSA/IG5ld1NlYXNvbi52aWRlb0lkcy5maWx0ZXIoaWQgPT4gaWQgIT09IHYuaWQpIDogWy4uLm5ld1NlYXNvbi52aWRlb0lkcywgdi5pZF07XFxuICAgICAgICAgICAgICAgICAgICAgIHNldE5ld1NlYXNvbih7Li4ubmV3U2Vhc29uLCB2aWRlb0lkczogaWRzfSk7XFxuICAgICAgICAgICAgICAgICAgICB9fSBjbGFzc05hbWU9e2BwLTIgcm91bmRlZC1sZyB0ZXh0LVs5cHhdIGZvbnQtYmxhY2sgY3Vyc29yLXBvaW50ZXIgdHJhbnNpdGlvbi1hbGwgYm9yZGVyICR7bmV3U2Vhc29uLnZpZGVvSWRzLmluY2x1ZGVzKHYuaWQpID8gJ2JnLXJlZC02MDAgYm9yZGVyLXJlZC01MDAgdGV4dC13aGl0ZScgOiAnYmctd2hpdGUvNSBib3JkZXItd2hpdGUvMTAgdGV4dC1ncmF5LTUwMCd9YH0+XFxuICAgICAgICAgICAgICAgICAgICAgIHt2LnRpdGxlfVxcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgKSl9XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBnYXAtMlxcXCI+XFxuICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17c2F2ZVNlYXNvbn0gY2xhc3NOYW1lPVxcXCJmbGV4LTEgYmctcmVkLTYwMCBweS0zIHJvdW5kZWQteGwgZm9udC1ibGFjayB1cHBlcmNhc2UgdGV4dC1bMTBweF0gc2hhZG93LWxnIHNoYWRvdy1yZWQtNjAwLzIwIHRleHQtd2hpdGVcXFwiPntlZGl0aW5nU2Vhc29uSWQgPyBcXFwi2K3Zgdi4INin2YTYqti52K/ZitmE2KfYqlxcXCIgOiBcXFwi2KXYttin2YHYqSDZhdmI2LPZhVxcXCJ9PC9idXR0b24+XFxuICAgICAgICAgICAgICAgIHtlZGl0aW5nU2Vhc29uSWQgJiYgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiB7IHNldEVkaXRpbmdTZWFzb25JZChudWxsKTsgc2V0TmV3U2Vhc29uKHsgdGl0bGU6IFxcXCJcXFwiLCBkZXNjcmlwdGlvbjogXFxcIlxcXCIsIHRodW1ibmFpbFVybDogXFxcIlxcXCIsIGNhdGVnb3J5OiAnb3BlbicsIHZpZGVvSWRzOiBbXSB9KTsgfX0gY2xhc3NOYW1lPVxcXCJiZy13aGl0ZS8xMCBweC00IHJvdW5kZWQteGwgdGV4dC1bMTBweF0gZm9udC1ibGFjayB1cHBlcmNhc2UgdGV4dC13aGl0ZVxcXCI+2KXZhNi62KfYoTwvYnV0dG9uPn1cXG4gICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwic3BhY2UteS02XFxcIj5cXG4gICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XFxcInRleHQteGwgZm9udC1ibGFjayB1cHBlcmNhc2UgYm9yZGVyLXItNCBib3JkZXItcmVkLTYwMCBwci00IHRleHQtd2hpdGVcXFwiPtil2K/Yp9ix2Kkg2KfZhNmF2YjYp9iz2YUg2KfZhNit2KfZhNmK2Kk8L2gzPlxcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImdyaWQgZ3JpZC1jb2xzLTIgc206Z3JpZC1jb2xzLTIgbGc6Z3JpZC1jb2xzLTMgZ2FwLTRcXFwiPlxcbiAgICAgICAgICAgICAgICB7c2Vhc29ucy5tYXAocyA9PiAoXFxuICAgICAgICAgICAgICAgICAgPGRpdiBrZXk9e3MuaWR9IGNsYXNzTmFtZT1cXFwiYmctd2hpdGUvNSBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHAtNSByb3VuZGVkLTN4bCBmbGV4IGZsZXgtY29sIGp1c3RpZnktYmV0d2VlbiBnYXAtNCBncm91cFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgb3ZlcmZsb3ctaGlkZGVuXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgPGltZyBzcmM9e3MudGh1bWJuYWlsVXJsIHx8IExPR09fVVJMfSBjbGFzc05hbWU9XFxcInctMTAgaC0xMCByb3VuZGVkLWxnIG9iamVjdC1jb3ZlciBib3JkZXIgYm9yZGVyLXdoaXRlLzEwXFxcIiAvPlxcbiAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwib3ZlcmZsb3ctaGlkZGVuXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XFxcImZvbnQtYmxhY2sgdGV4dC13aGl0ZSB0ZXh0LXNtIHRydW5jYXRlXFxcIj57cy50aXRsZX08L3A+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVxcXCJ0ZXh0LXJlZC01MDAgdGV4dC1bOXB4XSBmb250LWJsYWNrIHVwcGVyY2FzZVxcXCI+e3MudmlkZW9JZHMubGVuZ3RofSDZgdmK2K/ZitmIPC9wPlxcbiAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggZ2FwLTEganVzdGlmeS1lbmRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHsgc2V0RWRpdGluZ1NlYXNvbklkKHMuaWQpOyBzZXROZXdTZWFzb24oey4uLnN9KTsgd2luZG93LnNjcm9sbFRvKHsgdG9wOiAwLCBiZWhhdmlvcjogJ3Ntb290aCcgfSk7IH19IGNsYXNzTmFtZT1cXFwicC0yIHRleHQtYmx1ZS01MDAgaG92ZXI6YmctYmx1ZS01MDAvMTAgcm91bmRlZC1sZyB0cmFuc2l0aW9uLWFsbFxcXCI+PEVkaXQzIHNpemU9ezE2fS8+PC9idXR0b24+XFxuICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gZGVsZXRlRG9jKGRvYyhkYiwgJ3NlYXNvbnMnLCBzLmlkKSl9IGNsYXNzTmFtZT1cXFwicC0yIHRleHQtcmVkLTUwMCBob3ZlcjpiZy1yZWQtNTAwLzEwIHJvdW5kZWQtbGcgdHJhbnNpdGlvbi1hbGxcXFwiPjxUcmFzaDIgc2l6ZT17MTZ9Lz48L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICApKX1cXG4gICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICApfVxcbiAgICAgIHt0YWIgPT09ICdzZXR0aW5ncycgJiYgKFxcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInNwYWNlLXktMTJcXFwiPlxcbiAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImdsYXNzLWVmZmVjdCBwLTYgc206cC0xMCByb3VuZGVkLVsyLjVyZW1dIGJvcmRlciBib3JkZXItd2hpdGUvMTAgc3BhY2UteS02XFxcIj5cXG4gICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XFxcInRleHQteGwgZm9udC1ibGFjayB0ZXh0LXdoaXRlIGZsZXggaXRlbXMtY2VudGVyIGdhcC0zIGJvcmRlci1iIGJvcmRlci13aGl0ZS8xMCBwYi00XFxcIj48U2V0dGluZ3MgY2xhc3NOYW1lPVxcXCJ0ZXh0LXJlZC02MDBcXFwiLz4ge3Quc2V0dGluZ3NUYWJ9PC9oMz5cXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJzcGFjZS15LTJcXFwiPlxcbiAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPVxcXCJ0ZXh0LXhzIGZvbnQtYmxhY2sgdXBwZXJjYXNlIHRleHQtZ3JheS01MDAgcHgtMlxcXCI+e3QuYWRtaW5OYW1lTGFiZWx9PC9sYWJlbD5cXG4gICAgICAgICAgICAgICAgPGlucHV0IHBsYWNlaG9sZGVyPXt0LmFkbWluTmFtZUxhYmVsfSB2YWx1ZT17bmV3QWRtaW5OYW1lfSBvbkNoYW5nZT17ZSA9PiBzZXROZXdBZG1pbk5hbWUoZS50YXJnZXQudmFsdWUpfSBjbGFzc05hbWU9XFxcInctZnVsbCBiZy13aGl0ZS81IGJvcmRlciBib3JkZXItd2hpdGUvMTAgcC0zIHJvdW5kZWQteGwgdGV4dC13aGl0ZSB0ZXh0LXhzIG91dGxpbmUtbm9uZVxcXCIgLz5cXG4gICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXtzYXZlU2V0dGluZ3N9IGNsYXNzTmFtZT1cXFwidy1mdWxsIGJnLXJlZC02MDAgcHktMyByb3VuZGVkLXhsIGZvbnQtYmxhY2sgdXBwZXJjYXNlIHRleHQtWzEwcHhdIHNoYWRvdy1sZyBzaGFkb3ctcmVkLTYwMC8yMCB0ZXh0LXdoaXRlXFxcIj57dC5zYXZlU2V0dGluZ3N9PC9idXR0b24+XFxuICAgICAgICAgICAgICBcXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJwdC02IGJvcmRlci10IGJvcmRlci13aGl0ZS8xMCBzcGFjZS15LTRcXFwiPlxcbiAgICAgICAgICAgICAgICA8YnV0dG9uIFxcbiAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9e2Rvd25sb2FkUHJvamVjdEZpbGVzfSBcXG4gICAgICAgICAgICAgICAgICBkaXNhYmxlZD17aXNEb3dubG9hZGluZ31cXG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2NuKFxcbiAgICAgICAgICAgICAgICAgICAgXFxcInctZnVsbCBweS00IHJvdW5kZWQteGwgZm9udC1ibGFjayB1cHBlcmNhc2UgdGV4dC14cyBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMiB0cmFuc2l0aW9uLWFsbCB0ZXh0LXdoaXRlXFxcIixcXG4gICAgICAgICAgICAgICAgICAgIGlzRG93bmxvYWRpbmcgPyBcXFwiYmctd2hpdGUvMTAgb3BhY2l0eS01MCBjdXJzb3Itbm90LWFsbG93ZWRcXFwiIDogXFxcImJnLXdoaXRlLzUgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBob3ZlcjpiZy13aGl0ZS8xMFxcXCJcXG4gICAgICAgICAgICAgICAgICApfVxcbiAgICAgICAgICAgICAgICA+XFxuICAgICAgICAgICAgICAgICAgPERvd25sb2FkIHNpemU9ezE4fSBjbGFzc05hbWU9e2NuKFxcXCJ0ZXh0LXJlZC02MDBcXFwiLCBpc0Rvd25sb2FkaW5nICYmIFxcXCJhbmltYXRlLWJvdW5jZVxcXCIpfSAvPlxcbiAgICAgICAgICAgICAgICAgIHtpc0Rvd25sb2FkaW5nID8gXFxcItis2KfYsdmKINin2YTYqtit2YXZitmELi4uXFxcIiA6IHQuZG93bmxvYWRQcm9qZWN0fVxcbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAge2Rvd25sb2FkU3RhdHVzICYmIChcXG4gICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XFxcInRleHQtY2VudGVyIHRleHQtWzEwcHhdIGZvbnQtYmxhY2sgdGV4dC1yZWQtNTAwIGFuaW1hdGUtcHVsc2VcXFwiPntkb3dubG9hZFN0YXR1c308L3A+XFxuICAgICAgICAgICAgICAgICl9XFxuICAgICAgICAgICAgICAgIFxcbiAgICAgICAgICAgICAgICA8YnV0dG9uIFxcbiAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcXG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5jbGVhcigpO1xcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xcbiAgICAgICAgICAgICAgICAgIH19XFxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVxcXCJ3LWZ1bGwgYmctcmVkLTYwMC8xMCBib3JkZXIgYm9yZGVyLXJlZC02MDAvMjAgcHktMyByb3VuZGVkLXhsIGZvbnQtYmxhY2sgdXBwZXJjYXNlIHRleHQtWzEwcHhdIHRleHQtcmVkLTUwMCBob3ZlcjpiZy1yZWQtNjAwLzIwIHRyYW5zaXRpb24tYWxsXFxcIlxcbiAgICAgICAgICAgICAgICA+XFxuICAgICAgICAgICAgICAgICAgPFNoaWVsZEFsZXJ0IHNpemU9ezE0fSBjbGFzc05hbWU9XFxcImlubGluZSBtci0yXFxcIiAvPlxcbiAgICAgICAgICAgICAgICAgINit2YQg2YXYtNmD2YTYqSDYp9mE2LTYp9i02Kkg2KfZhNiz2YjYr9in2KEgKNil2LnYp9iv2Kkg2LbYqNi3KVxcbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cXG4gICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICApfVxcblxcbiAgICAgIHt0YWIgPT09ICdjb2RlJyAmJiAoXFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwic3BhY2UteS02XFxcIj5cXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlclxcXCI+XFxuICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cXFwidGV4dC14bCBmb250LWJsYWNrIHVwcGVyY2FzZSB0ZXh0LXdoaXRlIGJvcmRlci1yLTQgYm9yZGVyLXJlZC02MDAgcHItNFxcXCI+2K7Yp9mG2Kkg2KfZhNmD2YjYryAo2KfZhNmF2LXYp9iv2LEpPC9oMj5cXG4gICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9e2ZldGNoQ29kZX0gY2xhc3NOYW1lPVxcXCJwLTIgYmctd2hpdGUvNSByb3VuZGVkLWxnIHRleHQtZ3JheS00MDAgaG92ZXI6dGV4dC13aGl0ZSB0cmFuc2l0aW9uLWFsbFxcXCI+PFJlcGx5IHNpemU9ezE2fSBjbGFzc05hbWU9XFxcInJvdGF0ZS0xODBcXFwiLz48L2J1dHRvbj5cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgIFxcbiAgICAgICAgICB7bG9hZGluZ0NvZGUgPyAoXFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInAtMjAgdGV4dC1jZW50ZXIgYW5pbWF0ZS1wdWxzZSBmb250LWJsYWNrIHRleHQteHMgdXBwZXJjYXNlIG9wYWNpdHktMzBcXFwiPtis2KfYsdmKINis2YTYqCDYp9mE2YPZiNivLi4uPC9kaXY+XFxuICAgICAgICAgICkgOiAoXFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInNwYWNlLXktOFxcXCI+XFxuICAgICAgICAgICAgICB7T2JqZWN0LmVudHJpZXMoc291cmNlQ29kZSkubWFwKChbbmFtZSwgY29kZV0pID0+IChcXG4gICAgICAgICAgICAgICAgPGRpdiBrZXk9e25hbWV9IGNsYXNzTmFtZT1cXFwiZ2xhc3MtZWZmZWN0IHJvdW5kZWQtM3hsIGJvcmRlciBib3JkZXItd2hpdGUvMTAgb3ZlcmZsb3ctaGlkZGVuXFxcIj5cXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiYmctd2hpdGUvNSBwLTQgYm9yZGVyLWIgYm9yZGVyLXdoaXRlLzEwIGZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XFxcInRleHQtWzEwcHhdIGZvbnQtYmxhY2sgdXBwZXJjYXNlIHRleHQtcmVkLTUwMFxcXCI+e25hbWV9PC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBcXG4gICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4ge1xcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGNvZGUpO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsZXJ0KFxcXCLYqtmFINmG2LPYriDYp9mE2YPZiNivIVxcXCIpO1xcbiAgICAgICAgICAgICAgICAgICAgICB9fVxcbiAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XFxcInRleHQtWzlweF0gZm9udC1ibGFjayB1cHBlcmNhc2UgYmctcmVkLTYwMC8xMCB0ZXh0LXJlZC01MDAgcHgtMyBweS0xIHJvdW5kZWQtZnVsbCBob3ZlcjpiZy1yZWQtNjAwLzIwIHRyYW5zaXRpb24tYWxsXFxcIlxcbiAgICAgICAgICAgICAgICAgICAgPlxcbiAgICAgICAgICAgICAgICAgICAgICDZhtiz2K4g2KfZhNmD2YjYr1xcbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XFxuICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgPHByZSBjbGFzc05hbWU9XFxcInAtNiB0ZXh0LVsxMHB4XSB0ZXh0LWdyYXktNDAwIG92ZXJmbG93LXgtYXV0byBmb250LW1vbm8gbGVhZGluZy1yZWxheGVkIG1heC1oLVs0MDBweF1cXFwiPlxcbiAgICAgICAgICAgICAgICAgICAge2NvZGV9XFxuICAgICAgICAgICAgICAgICAgPC9wcmU+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgKSl9XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICl9XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICApfVxcbiAgICAgIHt0YWIgPT09ICdjb21tZW50cycgJiYgKFxcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImdyaWQgZ2FwLTRcXFwiPlxcbiAgICAgICAgICA8aDIgY2xhc3NOYW1lPVxcXCJ0ZXh0LXhsIGZvbnQtYmxhY2sgdXBwZXJjYXNlIHRleHQtd2hpdGUgbWItNCBib3JkZXItci00IGJvcmRlci1yZWQtNjAwIHByLTRcXFwiPnt0LmNvbW1lbnRzVGFifTwvaDI+XFxuICAgICAgICAgIHthbGxDb21tZW50cy5sZW5ndGggPT09IDAgPyAoXFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInAtMTAgdGV4dC1jZW50ZXIgb3BhY2l0eS0zMCBmb250LWJsYWNrIHRleHQteHMgdXBwZXJjYXNlXFxcIj7ZhNinINiq2YjYrNivINiq2LnZhNmK2YLYp9iqINit2KfZhNmK2KfZizwvZGl2PlxcbiAgICAgICAgICApIDogYWxsQ29tbWVudHMubWFwKGMgPT4gKFxcbiAgICAgICAgICAgIDxkaXYga2V5PXtjLmlkfSBjbGFzc05hbWU9XFxcImJnLXdoaXRlLzUgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBwLTQgcm91bmRlZC0yeGwgZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyIGdhcC00XFxcIj5cXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtM1xcXCI+XFxuICAgICAgICAgICAgICAgIDxpbWcgc3JjPXtjLnVzZXJQaG90b30gY2xhc3NOYW1lPVxcXCJ3LTEwIGgtMTAgcm91bmRlZC1sZyBvYmplY3QtY292ZXJcXFwiIC8+XFxuICAgICAgICAgICAgICAgIDxkaXY+XFxuICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVxcXCJ0ZXh0LXdoaXRlIGZvbnQtYm9sZCB0ZXh0LXhzXFxcIj57Yy51c2VyTmFtZX06IDxzcGFuIGNsYXNzTmFtZT1cXFwiZm9udC1ub3JtYWwgdGV4dC1ncmF5LTMwMFxcXCI+e2MudGV4dH08L3NwYW4+PC9wPlxcbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cXFwidGV4dC1bOHB4XSB0ZXh0LXJlZC01MDAgdXBwZXJjYXNlXFxcIj7ZgdmKOiB7Yy5tZWRpYVRpdGxlfTwvcD5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gZGVsZXRlRG9jKGRvYyhkYiwgJ2NvbW1lbnRzJywgYy5pZCkpfSBjbGFzc05hbWU9XFxcInRleHQtcmVkLTUwMCBwLTIgaG92ZXI6YmctcmVkLTUwMC8xMCByb3VuZGVkLWxnIHRyYW5zaXRpb24tYWxsXFxcIj48VHJhc2gyIHNpemU9ezE2fS8+PC9idXR0b24+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICkpfVxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgKX1cXG5cXG4gICAgICB7dGFiID09PSAnbm90aWZzJyAmJiAoXFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZ3JpZCBnYXAtNFxcXCI+XFxuICAgICAgICAgIDxoMiBjbGFzc05hbWU9XFxcInRleHQteGwgZm9udC1ibGFjayB1cHBlcmNhc2UgdGV4dC13aGl0ZSBtYi00IGJvcmRlci1yLTQgYm9yZGVyLXJlZC02MDAgcHItNFxcXCI+2KXYr9in2LHYqSDYp9mE2KrZhtio2YrZh9in2Ko8L2gyPlxcbiAgICAgICAgICB7bm90aWZpY2F0aW9ucy5tYXAobiA9PiAoXFxuICAgICAgICAgICAgPGRpdiBrZXk9e24uaWR9IGNsYXNzTmFtZT1cXFwiYmctd2hpdGUvNSBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHAtNCByb3VuZGVkLTJ4bCBmbGV4IGp1c3RpZnktYmV0d2VlbiBpdGVtcy1jZW50ZXIgZ2FwLTRcXFwiPlxcbiAgICAgICAgICAgICAgPGRpdj5cXG4gICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVxcXCJ0ZXh0LXdoaXRlIGZvbnQtYm9sZCB0ZXh0LXNtXFxcIj57bi50aXRsZX08L3A+XFxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cXFwidGV4dC1ncmF5LTQwMCB0ZXh0LXhzXFxcIj57bi5tZXNzYWdlfTwvcD5cXG4gICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBkZWxldGVEb2MoZG9jKGRiLCAnbm90aWZpY2F0aW9ucycsIG4uaWQpKX0gY2xhc3NOYW1lPVxcXCJ0ZXh0LXJlZC01MDAgcC0yIGhvdmVyOmJnLXJlZC01MDAvMTAgcm91bmRlZC1sZyB0cmFuc2l0aW9uLWFsbFxcXCI+PFRyYXNoMiBzaXplPXsxNn0vPjwvYnV0dG9uPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICApKX1cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICl9XFxuICAgIDwvZGl2PlxcbiAgKTtcXG59O1xcblxcbmNvbnN0IFNlYXJjaFZpZXcgPSAoKSA9PiB7XFxuICBjb25zdCB7IHQsIHZpZGVvcywgYm9va3MsIHNlYXNvbnMsIHBvc3RzLCBwbGFucywgc2VhcmNoUXVlcnksIHNldFNlYXJjaFF1ZXJ5LCBzZXRTZWxlY3RlZE1lZGlhLCBzZXRWaWV3LCBzZXRTZWxlY3RlZFNlYXNvbiB9ID0gdXNlQ29udGV4dChBcHBDb250ZXh0KTtcXG5cXG4gIGNvbnN0IGZpbHRlcmVkVmlkZW9zID0gdmlkZW9zLmZpbHRlcih2ID0+IHYudGl0bGUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhzZWFyY2hRdWVyeS50b0xvd2VyQ2FzZSgpKSB8fCB2LmRlc2NyaXB0aW9uLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoc2VhcmNoUXVlcnkudG9Mb3dlckNhc2UoKSkpO1xcbiAgY29uc3QgZmlsdGVyZWRCb29rcyA9IGJvb2tzLmZpbHRlcihiID0+IGIudGl0bGUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhzZWFyY2hRdWVyeS50b0xvd2VyQ2FzZSgpKSB8fCBiLmRlc2NyaXB0aW9uLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoc2VhcmNoUXVlcnkudG9Mb3dlckNhc2UoKSkpO1xcbiAgY29uc3QgZmlsdGVyZWRTZWFzb25zID0gc2Vhc29ucy5maWx0ZXIocyA9PiBzLnRpdGxlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoc2VhcmNoUXVlcnkudG9Mb3dlckNhc2UoKSkgfHwgcy5kZXNjcmlwdGlvbi50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHNlYXJjaFF1ZXJ5LnRvTG93ZXJDYXNlKCkpKTtcXG4gIGNvbnN0IGZpbHRlcmVkUG9zdHMgPSBwb3N0cy5maWx0ZXIocCA9PiBwLnRpdGxlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoc2VhcmNoUXVlcnkudG9Mb3dlckNhc2UoKSkgfHwgcC5jb250ZW50LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoc2VhcmNoUXVlcnkudG9Mb3dlckNhc2UoKSkpO1xcbiAgY29uc3QgZmlsdGVyZWRQbGFucyA9IHBsYW5zLmZpbHRlcihwID0+IHAubmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHNlYXJjaFF1ZXJ5LnRvTG93ZXJDYXNlKCkpKTtcXG5cXG4gIGNvbnN0IGhhc1Jlc3VsdHMgPSBmaWx0ZXJlZFZpZGVvcy5sZW5ndGggPiAwIHx8IGZpbHRlcmVkQm9va3MubGVuZ3RoID4gMCB8fCBmaWx0ZXJlZFNlYXNvbnMubGVuZ3RoID4gMCB8fCBmaWx0ZXJlZFBvc3RzLmxlbmd0aCA+IDAgfHwgZmlsdGVyZWRQbGFucy5sZW5ndGggPiAwO1xcblxcbiAgcmV0dXJuIChcXG4gICAgPGRpdiBjbGFzc05hbWU9XFxcIm1heC13LTd4bCBteC1hdXRvIHNwYWNlLXktMTIgcGItMzIgcHQtNCBweC0yIGFuaW1hdGUtZmFkZS1pblxcXCI+XFxuICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImdsYXNzLWVmZmVjdCBwLTYgc206cC0xMCByb3VuZGVkLVsyLjVyZW1dIGJvcmRlciBib3JkZXItd2hpdGUvMTAgc3BhY2UteS02XFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJyZWxhdGl2ZVxcXCI+XFxuICAgICAgICAgIDxTZWFyY2ggY2xhc3NOYW1lPVxcXCJhYnNvbHV0ZSBsZWZ0LTQgdG9wLTEvMiAtdHJhbnNsYXRlLXktMS8yIHRleHQtZ3JheS01MDBcXFwiIHNpemU9ezIwfSAvPlxcbiAgICAgICAgICA8aW5wdXQgXFxuICAgICAgICAgICAgYXV0b0ZvY3VzXFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI9e3Quc2VhcmNoUGxhY2Vob2xkZXJ9IFxcbiAgICAgICAgICAgIHZhbHVlPXtzZWFyY2hRdWVyeX0gXFxuICAgICAgICAgICAgb25DaGFuZ2U9e2UgPT4gc2V0U2VhcmNoUXVlcnkoZS50YXJnZXQudmFsdWUpfSBcXG4gICAgICAgICAgICBjbGFzc05hbWU9XFxcInctZnVsbCBiZy13aGl0ZS81IGJvcmRlciBib3JkZXItd2hpdGUvMTAgcC00IHBsLTEyIHJvdW5kZWQtMnhsIHRleHQtd2hpdGUgdGV4dC1zbSBvdXRsaW5lLW5vbmUgZm9jdXM6Ym9yZGVyLXJlZC02MDAgdHJhbnNpdGlvbi1hbGxcXFwiXFxuICAgICAgICAgIC8+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG5cXG4gICAgICB7c2VhcmNoUXVlcnkgJiYgKFxcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInNwYWNlLXktMTZcXFwiPlxcbiAgICAgICAgICB7IWhhc1Jlc3VsdHMgJiYgKFxcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJ0ZXh0LWNlbnRlciBweS0yMCBzcGFjZS15LTRcXFwiPlxcbiAgICAgICAgICAgICAgPFNlYXJjaCBzaXplPXs2MH0gY2xhc3NOYW1lPVxcXCJ0ZXh0LWdyYXktNzAwIG14LWF1dG9cXFwiIC8+XFxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XFxcInRleHQtZ3JheS01MDAgZm9udC1ibGFja1xcXCI+e3Qubm9SZXN1bHRzfTwvcD5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgKX1cXG5cXG4gICAgICAgICAge2ZpbHRlcmVkU2Vhc29ucy5sZW5ndGggPiAwICYmIChcXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwic3BhY2UteS02XFxcIj5cXG4gICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XFxcInRleHQteGwgZm9udC1ibGFjayB1cHBlcmNhc2UgYm9yZGVyLXItNCBib3JkZXItcmVkLTYwMCBwci00IHRleHQtd2hpdGVcXFwiPnt0LnNlYXNvbnN9PC9oMz5cXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJncmlkIGdyaWQtY29scy0yIHNtOmdyaWQtY29scy0zIG1kOmdyaWQtY29scy00IGxnOmdyaWQtY29scy01IGdhcC00XFxcIj5cXG4gICAgICAgICAgICAgICAge2ZpbHRlcmVkU2Vhc29ucy5tYXAocyA9PiAoXFxuICAgICAgICAgICAgICAgICAgPGRpdiBrZXk9e3MuaWR9IG9uQ2xpY2s9eygpID0+IHsgc2V0U2VsZWN0ZWRTZWFzb24ocyk7IHNldFZpZXcoJ3NlYXNvbi12aWV3Jyk7IH19IGNsYXNzTmFtZT1cXFwiZ3JvdXAgY3Vyc29yLXBvaW50ZXIgc3BhY2UteS0zXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJhc3BlY3QtWzMvNF0gcm91bmRlZC1bMnJlbV0gb3ZlcmZsb3ctaGlkZGVuIGJvcmRlciBib3JkZXItd2hpdGUvMTAgcmVsYXRpdmUgc2hhZG93LTJ4bCB0cmFuc2l0aW9uLWFsbCBkdXJhdGlvbi01MDAgZ3JvdXAtaG92ZXI6c2NhbGUtWzEuMDJdIGdyb3VwLWhvdmVyOmJvcmRlci1yZWQtNjAwLzUwXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgPGltZyBzcmM9e3MudGh1bWJuYWlsVXJsfSBjbGFzc05hbWU9XFxcInctZnVsbCBoLWZ1bGwgb2JqZWN0LWNvdmVyIHRyYW5zaXRpb24tdHJhbnNmb3JtIGR1cmF0aW9uLTcwMCBncm91cC1ob3ZlcjpzY2FsZS0xMTBcXFwiIHJlZmVycmVyUG9saWN5PVxcXCJuby1yZWZlcnJlclxcXCIgbG9hZGluZz1cXFwibGF6eVxcXCIgLz5cXG4gICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImFic29sdXRlIGluc2V0LTAgYmctZ3JhZGllbnQtdG8tdCBmcm9tLWJsYWNrIHZpYS1ibGFjay8yMCB0by10cmFuc3BhcmVudCBvcGFjaXR5LTgwIGdyb3VwLWhvdmVyOm9wYWNpdHktMTAwIHRyYW5zaXRpb24tb3BhY2l0eVxcXCI+PC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJhYnNvbHV0ZSBib3R0b20tNCByaWdodC00IGxlZnQtNFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVxcXCJ0ZXh0LXdoaXRlIGZvbnQtYmxhY2sgdGV4dC14cyBzbTp0ZXh0LXNtIGxpbmUtY2xhbXAtMiBsZWFkaW5nLXRpZ2h0XFxcIj57cy50aXRsZX08L3A+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIG10LTJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cXFwidGV4dC1bOHB4XSBmb250LWJsYWNrIHVwcGVyY2FzZSBweC0yIHB5LTAuNSByb3VuZGVkLWZ1bGwgYmctcmVkLTYwMCB0ZXh0LXdoaXRlXFxcIj57cy52aWRlb0lkcy5sZW5ndGh9IHt0LnZpZGVvc308L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICkpfVxcbiAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICl9XFxuXFxuICAgICAgICAgIHtmaWx0ZXJlZFZpZGVvcy5sZW5ndGggPiAwICYmIChcXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwic3BhY2UteS02XFxcIj5cXG4gICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XFxcInRleHQteGwgZm9udC1ibGFjayB1cHBlcmNhc2UgYm9yZGVyLXItNCBib3JkZXItcmVkLTYwMCBwci00IHRleHQtd2hpdGVcXFwiPnt0LmZyZWVWaWRlb3N9PC9oMz5cXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJncmlkIGdyaWQtY29scy0yIHNtOmdyaWQtY29scy0zIG1kOmdyaWQtY29scy00IGxnOmdyaWQtY29scy01IGdhcC00XFxcIj5cXG4gICAgICAgICAgICAgICAge2ZpbHRlcmVkVmlkZW9zLm1hcCh2ID0+IChcXG4gICAgICAgICAgICAgICAgICA8ZGl2IGtleT17di5pZH0gb25DbGljaz17KCkgPT4geyBzZXRTZWxlY3RlZE1lZGlhKHYpOyBzZXRWaWV3KCdob21lJyk7IHdpbmRvdy5zY3JvbGxUbyh7dG9wOjAsIGJlaGF2aW9yOidzbW9vdGgnfSk7IH19IGNsYXNzTmFtZT1cXFwiZ3JvdXAgY3Vyc29yLXBvaW50ZXIgc3BhY2UteS0zXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJhc3BlY3QtdmlkZW8gcm91bmRlZC0yeGwgb3ZlcmZsb3ctaGlkZGVuIGJvcmRlciBib3JkZXItd2hpdGUvMTAgcmVsYXRpdmUgc2hhZG93LTJ4bCB0cmFuc2l0aW9uLWFsbCBkdXJhdGlvbi01MDAgZ3JvdXAtaG92ZXI6c2NhbGUtWzEuMDJdIGdyb3VwLWhvdmVyOmJvcmRlci1yZWQtNjAwLzUwXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgPGltZyBzcmM9e3YudGh1bWJuYWlsVXJsfSBjbGFzc05hbWU9XFxcInctZnVsbCBoLWZ1bGwgb2JqZWN0LWNvdmVyIHRyYW5zaXRpb24tdHJhbnNmb3JtIGR1cmF0aW9uLTcwMCBncm91cC1ob3ZlcjpzY2FsZS0xMTBcXFwiIHJlZmVycmVyUG9saWN5PVxcXCJuby1yZWZlcnJlclxcXCIgbG9hZGluZz1cXFwibGF6eVxcXCIgLz5cXG4gICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImFic29sdXRlIGluc2V0LTAgYmctZ3JhZGllbnQtdG8tdCBmcm9tLWJsYWNrIHZpYS1ibGFjay8yMCB0by10cmFuc3BhcmVudCBvcGFjaXR5LTYwXFxcIj48L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImFic29sdXRlIGJvdHRvbS0zIHJpZ2h0LTMgbGVmdC0zXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XFxcInRleHQtd2hpdGUgZm9udC1ibGFjayB0ZXh0LVsxMHB4XSBzbTp0ZXh0LXhzIGxpbmUtY2xhbXAtMVxcXCI+e3YudGl0bGV9PC9wPlxcbiAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICApKX1cXG4gICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICApfVxcblxcbiAgICAgICAgICB7ZmlsdGVyZWRCb29rcy5sZW5ndGggPiAwICYmIChcXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwic3BhY2UteS02XFxcIj5cXG4gICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XFxcInRleHQteGwgZm9udC1ibGFjayB1cHBlcmNhc2UgYm9yZGVyLXItNCBib3JkZXItcmVkLTYwMCBwci00IHRleHQtd2hpdGVcXFwiPnt0Lm5vdmVsc308L2gzPlxcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImdyaWQgZ3JpZC1jb2xzLTIgc206Z3JpZC1jb2xzLTMgbWQ6Z3JpZC1jb2xzLTQgbGc6Z3JpZC1jb2xzLTUgZ2FwLTRcXFwiPlxcbiAgICAgICAgICAgICAgICB7ZmlsdGVyZWRCb29rcy5tYXAoYiA9PiAoXFxuICAgICAgICAgICAgICAgICAgPGRpdiBrZXk9e2IuaWR9IG9uQ2xpY2s9eygpID0+IHsgc2V0U2VsZWN0ZWRNZWRpYShiKTsgc2V0Vmlldygnbm92ZWxzJyk7IHdpbmRvdy5zY3JvbGxUbyh7dG9wOjAsIGJlaGF2aW9yOidzbW9vdGgnfSk7IH19IGNsYXNzTmFtZT1cXFwiZ3JvdXAgY3Vyc29yLXBvaW50ZXIgc3BhY2UteS0zXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJhc3BlY3QtWzMvNF0gcm91bmRlZC0yeGwgb3ZlcmZsb3ctaGlkZGVuIGJvcmRlciBib3JkZXItd2hpdGUvMTAgcmVsYXRpdmUgc2hhZG93LTJ4bCB0cmFuc2l0aW9uLWFsbCBkdXJhdGlvbi01MDAgZ3JvdXAtaG92ZXI6c2NhbGUtWzEuMDJdIGdyb3VwLWhvdmVyOmJvcmRlci1yZWQtNjAwLzUwXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgPGltZyBzcmM9e2IudGh1bWJuYWlsVXJsfSBjbGFzc05hbWU9XFxcInctZnVsbCBoLWZ1bGwgb2JqZWN0LWNvdmVyIHRyYW5zaXRpb24tdHJhbnNmb3JtIGR1cmF0aW9uLTcwMCBncm91cC1ob3ZlcjpzY2FsZS0xMTBcXFwiIHJlZmVycmVyUG9saWN5PVxcXCJuby1yZWZlcnJlclxcXCIgbG9hZGluZz1cXFwibGF6eVxcXCIgLz5cXG4gICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImFic29sdXRlIGluc2V0LTAgYmctZ3JhZGllbnQtdG8tdCBmcm9tLWJsYWNrIHZpYS1ibGFjay8yMCB0by10cmFuc3BhcmVudCBvcGFjaXR5LTgwXFxcIj48L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImFic29sdXRlIGJvdHRvbS0zIHJpZ2h0LTMgbGVmdC0zXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XFxcInRleHQtd2hpdGUgZm9udC1ibGFjayB0ZXh0LVsxMHB4XSBzbTp0ZXh0LXhzIGxpbmUtY2xhbXAtMiBsZWFkaW5nLXRpZ2h0XFxcIj57Yi50aXRsZX08L3A+XFxuICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICkpfVxcbiAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICl9XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICApfVxcbiAgICA8L2Rpdj5cXG4gICk7XFxufTtcXG5cXG5jb25zdCBTZWFzb25WaWV3ID0gKCkgPT4ge1xcbiAgY29uc3QgeyB0LCBzZWxlY3RlZFNlYXNvbiwgdmlkZW9zLCBzZXRTZWxlY3RlZE1lZGlhLCBzZXRWaWV3IH0gPSB1c2VDb250ZXh0KEFwcENvbnRleHQpO1xcbiAgaWYgKCFzZWxlY3RlZFNlYXNvbikgcmV0dXJuIG51bGw7XFxuXFxuICBjb25zdCBzZWFzb25WaWRlb3MgPSB2aWRlb3MuZmlsdGVyKHYgPT4gc2VsZWN0ZWRTZWFzb24udmlkZW9JZHMuaW5jbHVkZXModi5pZCkpO1xcblxcbiAgcmV0dXJuIChcXG4gICAgPGRpdiBjbGFzc05hbWU9XFxcIm1heC13LTd4bCBteC1hdXRvIHNwYWNlLXktMTIgcGItMzIgcHQtNCBweC0yIGFuaW1hdGUtZmFkZS1pblxcXCI+XFxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJyZWxhdGl2ZSBoLVs0MHZoXSBzbTpoLVs2MHZoXSByb3VuZGVkLVszcmVtXSBzbTpyb3VuZGVkLVs1cmVtXSBvdmVyZmxvdy1oaWRkZW4gYm9yZGVyLTIgYm9yZGVyLXdoaXRlLzEwIHNoYWRvdy0yeGxcXFwiPlxcbiAgICAgICAgICA8aW1nIHNyYz17c2VsZWN0ZWRTZWFzb24udGh1bWJuYWlsVXJsfSBjbGFzc05hbWU9XFxcInctZnVsbCBoLWZ1bGwgb2JqZWN0LWNvdmVyXFxcIiByZWZlcnJlclBvbGljeT1cXFwibm8tcmVmZXJyZXJcXFwiIGxvYWRpbmc9XFxcImxhenlcXFwiIC8+XFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJhYnNvbHV0ZSBpbnNldC0wIGJnLWdyYWRpZW50LXRvLXQgZnJvbS1ibGFjayB2aWEtYmxhY2svNDAgdG8tdHJhbnNwYXJlbnRcXFwiPjwvZGl2PlxcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiYWJzb2x1dGUgYm90dG9tLTEwIHJpZ2h0LTEwIGxlZnQtMTAgc3BhY2UteS00XFxcIj5cXG4gICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggaXRlbXMtY2VudGVyIGdhcC0zXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVxcXCJiZy1yZWQtNjAwIHRleHQtd2hpdGUgcHgtNCBweS0xIHJvdW5kZWQtZnVsbCB0ZXh0LVsxMHB4XSBmb250LWJsYWNrIHVwcGVyY2FzZSBzaGFkb3ctbGcgc2hhZG93LXJlZC02MDAvMjBcXFwiPntzZWxlY3RlZFNlYXNvbi5jYXRlZ29yeSA9PT0gJ3N1cGVyJyA/IHQuZWxpdGUgOiB0LmZyZWV9PC9zcGFuPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XFxcImJnLXdoaXRlLzEwIGJhY2tkcm9wLWJsdXItbWQgdGV4dC13aGl0ZSBweC00IHB5LTEgcm91bmRlZC1mdWxsIHRleHQtWzEwcHhdIGZvbnQtYmxhY2sgdXBwZXJjYXNlIGJvcmRlciBib3JkZXItd2hpdGUvMTBcXFwiPntzZWFzb25WaWRlb3MubGVuZ3RofSB7dC52aWRlb3N9PC9zcGFuPlxcbiAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgPGgxIGNsYXNzTmFtZT1cXFwidGV4dC00eGwgc206dGV4dC03eGwgZm9udC1ibGFjayB0ZXh0LXdoaXRlIGxlYWRpbmctdGlnaHRcXFwiPntzZWxlY3RlZFNlYXNvbi50aXRsZX08L2gxPlxcbiAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XFxcInRleHQtZ3JheS0zMDAgdGV4dC1zbSBzbTp0ZXh0LWxnIG1heC13LTN4bCBsaW5lLWNsYW1wLTMgbGVhZGluZy1yZWxheGVkXFxcIj57c2VsZWN0ZWRTZWFzb24uZGVzY3JpcHRpb259PC9wPlxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgPC9kaXY+XFxuXFxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJzcGFjZS15LTEwXFxcIj5cXG4gICAgICAgICAgPGgzIGNsYXNzTmFtZT1cXFwidGV4dC0yeGwgZm9udC1ibGFjayB1cHBlcmNhc2UgYm9yZGVyLXItNCBib3JkZXItcmVkLTYwMCBwci00IHRleHQtd2hpdGVcXFwiPnt0LnZpZGVvc308L2gzPlxcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZ3JpZCBncmlkLWNvbHMtMiBzbTpncmlkLWNvbHMtMyBtZDpncmlkLWNvbHMtNCBsZzpncmlkLWNvbHMtNSBnYXAtNlxcXCI+XFxuICAgICAgICAgICAgIHtzZWFzb25WaWRlb3MubWFwKCh2LCBpZHgpID0+IChcXG4gICAgICAgICAgICAgICA8ZGl2IGtleT17di5pZH0gb25DbGljaz17KCkgPT4geyBzZXRTZWxlY3RlZE1lZGlhKHYpOyBzZXRWaWV3KCdob21lJyk7IHdpbmRvdy5zY3JvbGxUbyh7dG9wOjAsIGJlaGF2aW9yOidzbW9vdGgnfSk7IH19IGNsYXNzTmFtZT1cXFwiZ3JvdXAgY3Vyc29yLXBvaW50ZXIgc3BhY2UteS00XFxcIj5cXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiYXNwZWN0LXZpZGVvIHJvdW5kZWQtM3hsIG92ZXJmbG93LWhpZGRlbiBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHJlbGF0aXZlIHNoYWRvdy0yeGwgdHJhbnNpdGlvbi1hbGwgZHVyYXRpb24tNTAwIGdyb3VwLWhvdmVyOnNjYWxlLVsxLjA1XSBncm91cC1ob3Zlcjpib3JkZXItcmVkLTYwMC81MFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8aW1nIHNyYz17di50aHVtYm5haWxVcmx9IGNsYXNzTmFtZT1cXFwidy1mdWxsIGgtZnVsbCBvYmplY3QtY292ZXIgdHJhbnNpdGlvbi10cmFuc2Zvcm0gZHVyYXRpb24tNzAwIGdyb3VwLWhvdmVyOnNjYWxlLTExMFxcXCIgcmVmZXJyZXJQb2xpY3k9XFxcIm5vLXJlZmVycmVyXFxcIiBsb2FkaW5nPVxcXCJsYXp5XFxcIiAvPlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImFic29sdXRlIGluc2V0LTAgYmctZ3JhZGllbnQtdG8tdCBmcm9tLWJsYWNrIHZpYS1ibGFjay8yMCB0by10cmFuc3BhcmVudCBvcGFjaXR5LTYwXFxcIj48L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJhYnNvbHV0ZSB0b3AtMyByaWdodC0zIHctOCBoLTggYmctcmVkLTYwMCByb3VuZGVkLWZ1bGwgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgdGV4dC13aGl0ZSBmb250LWJsYWNrIHRleHQteHMgc2hhZG93LWxnXFxcIj57aWR4ICsgMX08L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJhYnNvbHV0ZSBpbnNldC0wIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIG9wYWNpdHktMCBncm91cC1ob3ZlcjpvcGFjaXR5LTEwMCB0cmFuc2l0aW9uLW9wYWNpdHlcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInctMTIgaC0xMiBiZy1yZWQtNjAwIHJvdW5kZWQtZnVsbCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciB0ZXh0LXdoaXRlIHNoYWRvdy0yeGwgc2NhbGUtNzUgZ3JvdXAtaG92ZXI6c2NhbGUtMTAwIHRyYW5zaXRpb24tdHJhbnNmb3JtXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxQbGF5IHNpemU9ezI0fSBmaWxsPVxcXCJjdXJyZW50Q29sb3JcXFwiIC8+XFxuICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cXFwidGV4dC13aGl0ZSBmb250LWJsYWNrIHRleHQteHMgc206dGV4dC1zbSBsaW5lLWNsYW1wLTIgcHgtMiBncm91cC1ob3Zlcjp0ZXh0LXJlZC01MDAgdHJhbnNpdGlvbi1jb2xvcnNcXFwiPnt2LnRpdGxlfTwvcD5cXG4gICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgKSl9XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICApO1xcbn07XFxuXFxuY29uc3QgTWVkaWFSb3cgPSAoeyBsaXN0LCB0aXRsZSwgc2V0U2VsZWN0ZWRNZWRpYSwgdCwgdHlwZSA9ICd2aWRlbycgfTogeyBsaXN0OiBhbnlbXSwgdGl0bGU6IHN0cmluZywgc2V0U2VsZWN0ZWRNZWRpYTogYW55LCB0OiBhbnksIHR5cGU/OiAndmlkZW8nIHwgJ2Jvb2snIHwgJ3NlYXNvbicgfSkgPT4ge1xcbiAgY29uc3QgeyBzZXRWaWV3LCBzZXRTZWxlY3RlZFNlYXNvbiB9ID0gdXNlQ29udGV4dChBcHBDb250ZXh0KTtcXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkgcmV0dXJuIG51bGw7XFxuICByZXR1cm4gKFxcbiAgICA8ZGl2IGNsYXNzTmFtZT1cXFwic3BhY2UteS00IHNtOnNwYWNlLXktNiBhbmltYXRlLWZhZGUtaW4gcHgtMVxcXCI+XFxuICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHNtOmdhcC0zXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJ3LTEgaC02IHNtOmgtOCBiZy1yZWQtNjAwIHJvdW5kZWQtZnVsbCBzaGFkb3ctWzBfMF8xMHB4X3JnYmEoMjM5LDY4LDY4LDAuNSldXFxcIj48L2Rpdj5cXG4gICAgICAgIDxoMiBjbGFzc05hbWU9XFxcInRleHQtc20gc206dGV4dC0yeGwgZm9udC1ibGFjayB0ZXh0LXdoaXRlIHVwcGVyY2FzZSB0cmFja2luZy10aWdodFxcXCI+e3RpdGxlfTwvaDI+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImdyaWQgZ3JpZC1jb2xzLTMgZ2FwLTIgc206Z2FwLTRcXFwiPlxcbiAgICAgICAge2xpc3QubWFwKChpdGVtKSA9PiAoXFxuICAgICAgICAgIDxkaXYga2V5PXtpdGVtLmlkfSBvbkNsaWNrPXsoKSA9PiB7XFxuICAgICAgICAgICAgaWYgKHR5cGUgPT09ICdzZWFzb24nKSB7XFxuICAgICAgICAgICAgICBzZXRTZWxlY3RlZFNlYXNvbihpdGVtKTtcXG4gICAgICAgICAgICAgIHNldFZpZXcoJ3NlYXNvbi12aWV3Jyk7XFxuICAgICAgICAgICAgfSBlbHNlIHtcXG4gICAgICAgICAgICAgIHNldFNlbGVjdGVkTWVkaWEoaXRlbSk7XFxuICAgICAgICAgICAgfVxcbiAgICAgICAgICB9fSBjbGFzc05hbWU9XFxcImJnLWJsYWNrLzQwIGJhY2tkcm9wLWJsdXItM3hsIHJvdW5kZWQtbGcgc206cm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci13aGl0ZS81IG92ZXJmbG93LWhpZGRlbiBncm91cCBjdXJzb3ItcG9pbnRlciBob3Zlcjpib3JkZXItcmVkLTYwMC8zMCB0cmFuc2l0aW9uLWFsbCBzaGFkb3cteGwgYWN0aXZlOnNjYWxlLTk1XFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YHJlbGF0aXZlIG92ZXJmbG93LWhpZGRlbiAke3R5cGUgPT09ICd2aWRlbycgPyAnYXNwZWN0LXZpZGVvJyA6ICdhc3BlY3QtWzMvNF0nfWB9PlxcbiAgICAgICAgICAgICAgIDxpbWcgc3JjPXtpdGVtLnRodW1ibmFpbFVybCB8fCBMT0dPX1VSTH0gY2xhc3NOYW1lPVxcXCJ3LWZ1bGwgaC1mdWxsIG9iamVjdC1jb3ZlciBncm91cC1ob3ZlcjpzY2FsZS0xMTAgdHJhbnNpdGlvbi10cmFuc2Zvcm0gZHVyYXRpb24tNzAwXFxcIiBsb2FkaW5nPVxcXCJsYXp5XFxcIiAvPlxcbiAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJhYnNvbHV0ZSBpbnNldC0wIGJnLWdyYWRpZW50LXRvLXQgZnJvbS1ibGFjay84MCB0by10cmFuc3BhcmVudCBmbGV4IGl0ZW1zLWVuZCBwLTEgc206cC0zXFxcIj5cXG4gICAgICAgICAgICAgICAgICA8UGxheSBjbGFzc05hbWU9XFxcInRleHQtd2hpdGUgZ3JvdXAtaG92ZXI6dGV4dC1yZWQtNTAwIHRyYW5zaXRpb24tY29sb3JzIHctMyBoLTMgc206dy02IHNtOmgtNlxcXCIgLz5cXG4gICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICB7dHlwZSA9PT0gJ3NlYXNvbicgJiYgKFxcbiAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImFic29sdXRlIHRvcC0yIHJpZ2h0LTIgYmctcmVkLTYwMCB0ZXh0LXdoaXRlIHB4LTIgcHktMC41IHJvdW5kZWQtZnVsbCB0ZXh0LVs2cHhdIHNtOnRleHQtWzhweF0gZm9udC1ibGFjayB1cHBlcmNhc2Ugc2hhZG93LWxnXFxcIj5cXG4gICAgICAgICAgICAgICAgICAge2l0ZW0udmlkZW9JZHMubGVuZ3RofSB7dC52aWRlb3N9XFxuICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICApfVxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJwLTEuNSBzbTpwLTNcXFwiPlxcbiAgICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XFxcImZvbnQtYmxhY2sgdGV4dC13aGl0ZSB0ZXh0LVs3cHhdIHNtOnRleHQteHMgbGluZS1jbGFtcC0xIGdyb3VwLWhvdmVyOnRleHQtcmVkLTUwMCB0cmFuc2l0aW9uLWNvbG9yc1xcXCI+e2l0ZW0udGl0bGV9PC9oMz5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgICApKX1cXG4gICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICApO1xcbn07XFxuXFxuY29uc3QgRm9ydW1WaWV3ID0gKCkgPT4ge1xcbiAgY29uc3QgeyB1c2VyLCB0LCBpc0FkbWluIH0gPSB1c2VDb250ZXh0KEFwcENvbnRleHQpO1xcbiAgY29uc3QgW21lc3NhZ2VzLCBzZXRNZXNzYWdlc10gPSB1c2VTdGF0ZTxGb3J1bU1lc3NhZ2VbXT4oW10pO1xcbiAgY29uc3QgW3RleHQsIHNldFRleHRdID0gdXNlU3RhdGUoXFxcIlxcXCIpO1xcbiAgY29uc3QgW3JlcGx5VG8sIHNldFJlcGx5VG9dID0gdXNlU3RhdGU8YW55PihudWxsKTtcXG4gIGNvbnN0IFtpc1NlbmRpbmcsIHNldElzU2VuZGluZ10gPSB1c2VTdGF0ZShmYWxzZSk7XFxuICBjb25zdCBbaXNTdWJzY3JpYmVkLCBzZXRJc1N1YnNjcmliZWRdID0gdXNlU3RhdGUoZmFsc2UpO1xcbiAgY29uc3Qgc2Nyb2xsUmVmID0gdXNlUmVmPEhUTUxEaXZFbGVtZW50PihudWxsKTtcXG5cXG4gIHVzZUVmZmVjdCgoKSA9PiB7XFxuICAgIGlmICh1c2VyKSB7XFxuICAgICAgc2V0SXNTdWJzY3JpYmVkKHVzZXIuaXNTdWJzY3JpYmVkIHx8IGlzQWRtaW4pO1xcbiAgICB9XFxuICB9LCBbdXNlciwgaXNBZG1pbl0pO1xcblxcbiAgdXNlRWZmZWN0KCgpID0+IHtcXG4gICAgaWYgKCFpc1N1YnNjcmliZWQpIHJldHVybjtcXG4gICAgY29uc3QgcSA9IHF1ZXJ5KGNvbGxlY3Rpb24oZGIsICdmb3J1bV9tZXNzYWdlcycpLCBvcmRlckJ5KCd0aW1lc3RhbXAnLCAnYXNjJyksIGxpbWl0KDEwMCkpO1xcbiAgICByZXR1cm4gb25TbmFwc2hvdChxLCAocykgPT4gc2V0TWVzc2FnZXMocy5kb2NzLm1hcChkID0+ICh7IGlkOiBkLmlkLCAuLi5kLmRhdGEoKSB9IGFzIEZvcnVtTWVzc2FnZSkpKSk7XFxuICB9LCBbaXNTdWJzY3JpYmVkXSk7XFxuXFxuICB1c2VFZmZlY3QoKCkgPT4ge1xcbiAgICBzY3JvbGxSZWYuY3VycmVudD8uc2Nyb2xsVG8oeyB0b3A6IHNjcm9sbFJlZi5jdXJyZW50LnNjcm9sbEhlaWdodCwgYmVoYXZpb3I6ICdzbW9vdGgnIH0pO1xcbiAgfSwgW21lc3NhZ2VzXSk7XFxuXFxuICBpZiAoIWlzU3Vic2NyaWJlZCkge1xcbiAgICByZXR1cm4gKFxcbiAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJtYXgtdy00eGwgbXgtYXV0byBtdC0yMCBwLTEwIGdsYXNzLWVmZmVjdCByb3VuZGVkLVszcmVtXSBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHRleHQtY2VudGVyIHNwYWNlLXktNiBhbmltYXRlLWZhZGUtaW5cXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInctMjQgaC0yNCBiZy1yZWQtNjAwLzIwIHJvdW5kZWQtZnVsbCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBteC1hdXRvIGJvcmRlciBib3JkZXItcmVkLTYwMC8zMFxcXCI+XFxuICAgICAgICAgIDxMb2NrIHNpemU9ezQwfSBjbGFzc05hbWU9XFxcInRleHQtcmVkLTYwMFxcXCIgLz5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGgyIGNsYXNzTmFtZT1cXFwidGV4dC0zeGwgZm9udC1ibGFjayB0ZXh0LXdoaXRlXFxcIj57dC5mb3J1bUxvY2tlZH08L2gyPlxcbiAgICAgICAgPHAgY2xhc3NOYW1lPVxcXCJ0ZXh0LWdyYXktNDAwIHRleHQtc20gbGVhZGluZy1yZWxheGVkXFxcIj57dC5zdWJzY3JpYmVQcm9tcHR9PC9wPlxcbiAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiB3aW5kb3cubG9jYXRpb24uaHJlZiA9ICcjcGxhbnMnfSBjbGFzc05hbWU9XFxcImJnLXJlZC02MDAgdGV4dC13aGl0ZSBweC0xMCBweS00IHJvdW5kZWQtMnhsIGZvbnQtYmxhY2sgdXBwZXJjYXNlIHRleHQteHMgc2hhZG93LXhsIHNoYWRvdy1yZWQtNjAwLzIwIGhvdmVyOnNjYWxlLTEwNSB0cmFuc2l0aW9uLWFsbFxcXCI+XFxuICAgICAgICAgIHt0LnN1YnNjcmliZU5vd31cXG4gICAgICAgIDwvYnV0dG9uPlxcbiAgICAgIDwvZGl2PlxcbiAgICApO1xcbiAgfVxcblxcbiAgY29uc3Qgc2VuZE1lc3NhZ2UgPSBhc3luYyAoKSA9PiB7XFxuICAgIGlmICghdGV4dC50cmltKCkgfHwgIXVzZXIgfHwgaXNTZW5kaW5nKSByZXR1cm47XFxuICAgIGlmICghdXNlci5pc1N1YnNjcmliZWQgJiYgIWlzQWRtaW4pIHsgXFxuICAgICAgYWxlcnQoXFxcItmH2LDYpyDYp9mE2YXYrNmE2LMg2YXYrti12LUg2YTZhNi52YXYp9mE2YLYqSDYp9mE2YXYtNiq2LHZg9mK2YYg2YHZgti3LiDZitix2KzZiSDYqtmB2LnZitmEINin2LTYqtix2KfZg9mDINmE2YTYp9mG2LbZhdin2YUhXFxcIik7IFxcbiAgICAgIHJldHVybjsgXFxuICAgIH1cXG4gICAgaWYgKHVzZXIuaXNNdXRlZCkgeyBhbGVydChcXFwi2YTZgtivINiq2YUg2YPYqtmF2YMg2YXZhiDZgtio2YQg2KfZhNil2K/Yp9ix2KkuXFxcIik7IHJldHVybjsgfVxcbiAgICBcXG4gICAgc2V0SXNTZW5kaW5nKHRydWUpO1xcbiAgICB0cnkge1xcbiAgICAgIGF3YWl0IGFkZERvYyhjb2xsZWN0aW9uKGRiLCAnZm9ydW1fbWVzc2FnZXMnKSwge1xcbiAgICAgICAgdXNlcklkOiB1c2VyLmlkLCB1c2VyTmFtZTogdXNlci5uYW1lLCB1c2VyUGhvdG86IHVzZXIucGhvdG9VcmwsXFxuICAgICAgICB0ZXh0OiB0ZXh0LCB0aW1lc3RhbXA6IERhdGUubm93KCksIGlzQWRtaW46IGlzQWRtaW4sXFxuICAgICAgICByZXBseVRvOiByZXBseVRvID8geyBpZDogcmVwbHlUby5pZCwgdXNlck5hbWU6IHJlcGx5VG8udXNlck5hbWUsIHRleHQ6IHJlcGx5VG8udGV4dCB9IDogbnVsbFxcbiAgICAgIH0pO1xcbiAgICAgIHNldFRleHQoXFxcIlxcXCIpOyBzZXRSZXBseVRvKG51bGwpO1xcbiAgICB9IGNhdGNoIChlcnJvcikge1xcbiAgICAgIGNvbnNvbGUuZXJyb3IoXFxcIkVycm9yIHNlbmRpbmcgbWVzc2FnZTpcXFwiLCBlcnJvcik7XFxuICAgICAgYWxlcnQoXFxcItit2K/YqyDYrti32KMg2KPYq9mG2KfYoSDYpdix2LPYp9mEINin2YTYsdiz2KfZhNipLiDZitix2KzZiSDYp9mE2YXYrdin2YjZhNipINmF2LHYqSDYo9iu2LHZiS5cXFwiKTtcXG4gICAgfSBmaW5hbGx5IHtcXG4gICAgICBzZXRJc1NlbmRpbmcoZmFsc2UpO1xcbiAgICB9XFxuICB9O1xcblxcbiAgY29uc3QgZGVsZXRlTXNnID0gYXN5bmMgKGlkOiBzdHJpbmcsIGF1dGhvcklkOiBzdHJpbmcpID0+IHtcXG4gICAgaWYgKGlzQWRtaW4gfHwgYXV0aG9ySWQgPT09IHVzZXIuaWQpIHtcXG4gICAgICAgaWYgKHdpbmRvdy5jb25maXJtKFxcXCLYrdiw2YEg2YfYsNmHINin2YTYsdiz2KfZhNip2J9cXFwiKSkgYXdhaXQgZGVsZXRlRG9jKGRvYyhkYiwgJ2ZvcnVtX21lc3NhZ2VzJywgaWQpKTtcXG4gICAgfVxcbiAgfTtcXG5cXG4gIGNvbnN0IGVkaXRNc2cgPSBhc3luYyAoaWQ6IHN0cmluZywgYXV0aG9ySWQ6IHN0cmluZywgb2xkVGV4dDogc3RyaW5nKSA9PiB7XFxuICAgIGlmIChhdXRob3JJZCAhPT0gdXNlci5pZCkgcmV0dXJuO1xcbiAgICBjb25zdCBuZXdUZXh0ID0gcHJvbXB0KFxcXCLYqti52K/ZitmEINin2YTYsdiz2KfZhNipOlxcXCIsIG9sZFRleHQpO1xcbiAgICBpZiAobmV3VGV4dCAmJiBuZXdUZXh0ICE9PSBvbGRUZXh0KSB7XFxuICAgICAgIGF3YWl0IHVwZGF0ZURvYyhkb2MoZGIsICdmb3J1bV9tZXNzYWdlcycsIGlkKSwgeyB0ZXh0OiBuZXdUZXh0IH0pO1xcbiAgICB9XFxuICB9O1xcblxcbiAgcmV0dXJuIChcXG4gICAgPGRpdiBjbGFzc05hbWU9XFxcIm1heC13LTR4bCBteC1hdXRvIGgtWzY1dmhdIHNtOmgtWzcwdmhdIGZsZXggZmxleC1jb2wgYmctYmxhY2svNDAgYmFja2Ryb3AtYmx1ci0zeGwgcm91bmRlZC1bMnJlbV0gc206cm91bmRlZC1bM3JlbV0gYm9yZGVyIGJvcmRlci13aGl0ZS81IG92ZXJmbG93LWhpZGRlbiBzaGFkb3ctMnhsIGFuaW1hdGUtZmFkZS1pblxcXCI+XFxuICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInAtNCBzbTpwLTggYm9yZGVyLWIgYm9yZGVyLXdoaXRlLzUgZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyIGJnLXdoaXRlL1swLjAyXVxcXCI+XFxuICAgICAgICAgPGgyIGNsYXNzTmFtZT1cXFwidGV4dC1sZyBzbTp0ZXh0LTJ4bCBmb250LWJsYWNrIHRleHQtd2hpdGUgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgc206Z2FwLTNcXFwiPjxNZXNzYWdlU3F1YXJlIGNsYXNzTmFtZT1cXFwidGV4dC1yZWQtNjAwXFxcIi8+IHt0LmZvcnVtfTwvaDI+XFxuICAgICAgICAge3JlcGx5VG8gJiYgKFxcbiAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImJnLXJlZC02MDAvMTAgYm9yZGVyIGJvcmRlci1yZWQtNjAwLzIwIHB4LTIgcHktMSByb3VuZGVkLWxnIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yIGFuaW1hdGUtZmFkZS1pblxcXCI+XFxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XFxcInRleHQtWzhweF0gc206dGV4dC1bMTBweF0gdGV4dC1yZWQtNTAwIGZvbnQtYmxhY2sgdXBwZXJjYXNlIHRydW5jYXRlIG1heC13LVs4MHB4XVxcXCI+e3QucmVwbHlUb306IHtyZXBseVRvLnVzZXJOYW1lfTwvc3Bhbj5cXG4gICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gc2V0UmVwbHlUbyhudWxsKX0gY2xhc3NOYW1lPVxcXCJ0ZXh0LXdoaXRlXFxcIj48WCBzaXplPXsxMH0vPjwvYnV0dG9uPlxcbiAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgKX1cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IHJlZj17c2Nyb2xsUmVmfSBjbGFzc05hbWU9XFxcImZsZXgtMSBvdmVyZmxvdy15LWF1dG8gcC00IHNtOnAtOCBzcGFjZS15LTQgc206c3BhY2UteS02IHNjcm9sbGJhci1oaWRlXFxcIj5cXG4gICAgICAgICB7bWVzc2FnZXMubGVuZ3RoID09PSAwID8gKFxcbiAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImgtZnVsbCBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciB0ZXh0LWdyYXktNjAwIHNwYWNlLXktNFxcXCI+XFxuICAgICAgICAgICAgICA8TWVzc2FnZUNpcmNsZSBzaXplPXs0MH0gY2xhc3NOYW1lPVxcXCJhbmltYXRlLXB1bHNlXFxcIiAvPlxcbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVxcXCJmb250LWJsYWNrIHVwcGVyY2FzZSB0ZXh0LVsxMHB4XSB0cmFja2luZy13aWRlc3RcXFwiPnt0Lm5vTWVzc2FnZXN9PC9wPlxcbiAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgKSA6IG1lc3NhZ2VzLm1hcCgobSkgPT4gKFxcbiAgICAgICAgICAgPGRpdiBrZXk9e20uaWR9IGNsYXNzTmFtZT17YGZsZXggZ2FwLTIgc206Z2FwLTQgJHttLnVzZXJJZCA9PT0gdXNlcj8uaWQgPyAnZmxleC1yb3ctcmV2ZXJzZScgOiAnJ30gYW5pbWF0ZS1mYWRlLWluYH0+XFxuICAgICAgICAgICAgICA8aW1nIHNyYz17bS51c2VyUGhvdG99IGNsYXNzTmFtZT1cXFwidy04IGgtOCBzbTp3LTEwIHNtOmgtMTAgcm91bmRlZC1sZyBvYmplY3QtY292ZXIgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBzaHJpbmstMFxcXCIgLz5cXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgbWF4LXctWzg1JV0gc206bWF4LXctWzcwJV0gc3BhY2UteS0xIHNtOnNwYWNlLXktMiAke20udXNlcklkID09PSB1c2VyPy5pZCA/ICdpdGVtcy1lbmQnIDogJyd9YH0+XFxuICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YGZsZXggaXRlbXMtY2VudGVyIGdhcC0yICR7bS51c2VySWQgPT09IHVzZXI/LmlkID8gJ2ZsZXgtcm93LXJldmVyc2UnIDogJyd9YH0+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XFxcInRleHQtWzhweF0gc206dGV4dC1bMTBweF0gZm9udC1ibGFjayB0ZXh0LWdyYXktNTAwIHVwcGVyY2FzZVxcXCI+e20udXNlck5hbWV9PC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAge20uaXNBZG1pbiAmJiA8U2hpZWxkQ2hlY2sgc2l6ZT17MTB9IGNsYXNzTmFtZT1cXFwidGV4dC1yZWQtNjAwXFxcIiAvPn1cXG4gICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAge20ucmVwbHlUbyAmJiAoXFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiYmctd2hpdGUvNSBib3JkZXItci0yIGJvcmRlci1yZWQtNjAwIHAtMiByb3VuZGVkLWxnIHRleHQtWzlweF0gdGV4dC1ncmF5LTUwMCBpdGFsaWNcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVxcXCJmb250LWJsYWNrIHRleHQtcmVkLTUwMCBibG9jayBtYi0xXFxcIj57bS5yZXBseVRvLnVzZXJOYW1lfTwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cXFwibGluZS1jbGFtcC0xXFxcIj57bS5yZXBseVRvLnRleHR9PC9wPlxcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICApfVxcbiAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInJlbGF0aXZlIGdyb3VwXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgPGRpdiBvbkNsaWNrPXsoKSA9PiBzZXRSZXBseVRvKG0pfSBjbGFzc05hbWU9e2BwLTMgc206cC00IHJvdW5kZWQtMnhsIGN1cnNvci1wb2ludGVyIGhvdmVyOnNjYWxlLVsxLjAxXSB0cmFuc2l0aW9uLWFsbCAke20udXNlcklkID09PSB1c2VyPy5pZCA/ICdiZy1yZWQtNjAwIHRleHQtd2hpdGUgcm91bmRlZC10ci1ub25lIHNoYWRvdy1sZycgOiAnYmctd2hpdGUvNSB0ZXh0LWdyYXktMzAwIHJvdW5kZWQtdGwtbm9uZSBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHNoYWRvdy1sZyd9YH0+XFxuICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cXFwidGV4dC14cyBzbTp0ZXh0LXNtIGZvbnQtbWVkaXVtIGxlYWRpbmctcmVsYXhlZCBicmVhay13b3Jkc1xcXCI+e20udGV4dH08L3A+XFxuICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cXFwidGV4dC1bN3B4XSBvcGFjaXR5LTQwIG10LTEgZm9udC1ibGFjayB1cHBlcmNhc2VcXFwiPntuZXcgRGF0ZShtLnRpbWVzdGFtcCkudG9Mb2NhbGVUaW1lU3RyaW5nKFtdLCB7aG91cjogJzItZGlnaXQnLCBtaW51dGU6JzItZGlnaXQnfSl9PC9wPlxcbiAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2BhYnNvbHV0ZSB0b3AtMCBmbGV4IGdhcC0xIG9wYWNpdHktMCBncm91cC1ob3ZlcjpvcGFjaXR5LTEwMCB0cmFuc2l0aW9uLWFsbCAke20udXNlcklkID09PSB1c2VyPy5pZCA/ICctcmlnaHQtMTInIDogJy1sZWZ0LTEyJ31gfT5cXG4gICAgICAgICAgICAgICAgICAgICAgeyhpc0FkbWluIHx8IG0udXNlcklkID09PSB1c2VyPy5pZCkgJiYgKFxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gZGVsZXRlTXNnKG0uaWQsIG0udXNlcklkKX0gY2xhc3NOYW1lPVxcXCJwLTEuNSBiZy1yZWQtNjAwLzIwIHRleHQtcmVkLTUwMCByb3VuZGVkLWxnXFxcIj48VHJhc2gyIHNpemU9ezEyfS8+PC9idXR0b24+XFxuICAgICAgICAgICAgICAgICAgICAgICl9XFxuICAgICAgICAgICAgICAgICAgICAgIHttLnVzZXJJZCA9PT0gdXNlcj8uaWQgJiYgKFxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gZWRpdE1zZyhtLmlkLCBtLnVzZXJJZCwgbS50ZXh0IHx8ICcnKX0gY2xhc3NOYW1lPVxcXCJwLTEuNSBiZy1ibHVlLTYwMC8yMCB0ZXh0LWJsdWUtNTAwIHJvdW5kZWQtbGdcXFwiPjxFZGl0MyBzaXplPXsxMn0vPjwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICAgICAgICApfVxcbiAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHNldFJlcGx5VG8obSl9IGNsYXNzTmFtZT1cXFwicC0xLjUgYmctZ3JlZW4tNjAwLzIwIHRleHQtZ3JlZW4tNTAwIHJvdW5kZWQtbGdcXFwiPjxSZXBseSBzaXplPXsxMn0vPjwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICApKX1cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwicC0zIHNtOnAtNiBiZy1ibGFjay80MCBib3JkZXItdCBib3JkZXItd2hpdGUvNVxcXCI+XFxuICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggZ2FwLTIgaXRlbXMtY2VudGVyIGJnLXdoaXRlLzUgcC0xLjUgc206cC0yIHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBmb2N1cy13aXRoaW46Ym9yZGVyLXJlZC02MDAgdHJhbnNpdGlvbi1jb2xvcnNcXFwiPlxcbiAgICAgICAgICAgIDxpbnB1dCB2YWx1ZT17dGV4dH0gb25DaGFuZ2U9eyhlKSA9PiBzZXRUZXh0KGUudGFyZ2V0LnZhbHVlKX0gZGlzYWJsZWQ9e2lzU2VuZGluZ30gb25LZXlEb3duPXtlID0+IGUua2V5ID09PSAnRW50ZXInICYmIHNlbmRNZXNzYWdlKCl9IHBsYWNlaG9sZGVyPXt0LmZvcnVtUGxhY2Vob2xkZXJ9IGNsYXNzTmFtZT1cXFwiZmxleC0xIGJnLXRyYW5zcGFyZW50IGJvcmRlci1ub25lIG91dGxpbmUtbm9uZSBwLTEuNSBzbTpwLTMgdGV4dC14cyBzbTp0ZXh0LXNtIHRleHQtd2hpdGUgZGlzYWJsZWQ6b3BhY2l0eS01MFxcXCIgLz5cXG4gICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9e3NlbmRNZXNzYWdlfSBkaXNhYmxlZD17aXNTZW5kaW5nfSBjbGFzc05hbWU9XFxcImJnLXJlZC02MDAgcC0yIHNtOnAtMyByb3VuZGVkLWxnIGhvdmVyOnNjYWxlLTEwNSBhY3RpdmU6c2NhbGUtOTUgdHJhbnNpdGlvbi1hbGwgc2hhZG93LWxnIGRpc2FibGVkOm9wYWNpdHktNTAgZGlzYWJsZWQ6c2NhbGUtMTAwXFxcIj5cXG4gICAgICAgICAgICAgICB7aXNTZW5kaW5nID8gPGRpdiBjbGFzc05hbWU9XFxcInctNCBoLTQgYm9yZGVyLTIgYm9yZGVyLXdoaXRlLzMwIGJvcmRlci10LXdoaXRlIHJvdW5kZWQtZnVsbCBhbmltYXRlLXNwaW5cXFwiPjwvZGl2PiA6IDxTZW5kIHNpemU9ezE2fSBjbGFzc05hbWU9XFxcInRleHQtd2hpdGVcXFwiIC8+fVxcbiAgICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgIDwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gICk7XFxufTtcXG5cXG5jb25zdCBQb3N0VmlldyA9ICh7IHBvc3QsIG9uQmFjaywgdCB9OiB7IHBvc3Q6IFBvc3QsIG9uQmFjazogKCkgPT4gdm9pZCwgdDogYW55IH0pID0+IHtcXG4gIHJldHVybiAoXFxuICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJtYXgtdy01eGwgbXgtYXV0byBzcGFjZS15LTggc206c3BhY2UteS0xMiBhbmltYXRlLWZhZGUtaW4gcGItNDAgcHgtMVxcXCI+XFxuICAgICAgIDxidXR0b24gb25DbGljaz17b25CYWNrfSBjbGFzc05hbWU9XFxcImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHRleHQtZ3JheS01MDAgaG92ZXI6dGV4dC13aGl0ZSB0cmFuc2l0aW9uLWFsbCB1cHBlcmNhc2UgZm9udC1ibGFjayB0ZXh0LVsxMHB4XSBzbTp0ZXh0LXhzXFxcIj48Q2hldnJvbkxlZnQgc2l6ZT17MTR9Lz4ge3QuYmFja308L2J1dHRvbj5cXG4gICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInNwYWNlLXktNiBzbTpzcGFjZS15LThcXFwiPlxcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBmbGV4LWNvbCBzbTpmbGV4LXJvdyBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtc3RhcnQgc206aXRlbXMtZW5kIGJvcmRlci1iIGJvcmRlci13aGl0ZS81IHBiLTYgc206cGItOCBnYXAtNCBzbTpnYXAtNlxcXCI+XFxuICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJzcGFjZS15LTIgc206c3BhY2UteS0zIGZsZXgtMVxcXCI+XFxuICAgICAgICAgICAgICAgIDxoMSBjbGFzc05hbWU9XFxcInRleHQtMnhsIHNtOnRleHQtNnhsIGZvbnQtYmxhY2sgdGV4dC13aGl0ZSBsb2dvLXRleHQtZ2xvdyBsZWFkaW5nLXRpZ2h0IGJyZWFrLXdvcmRzXFxcIj57cG9zdC50aXRsZX08L2gxPlxcbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XFxcInRleHQtcmVkLTUwMCBmb250LWJsYWNrIHRleHQtWzhweF0gc206dGV4dC1bMTBweF0gdXBwZXJjYXNlIHRyYWNraW5nLVswLjJlbV0gc206dHJhY2tpbmctWzAuM2VtXVxcXCI+e3Bvc3QuYWRtaW5OYW1lfSBAIHtuZXcgRGF0ZShwb3N0LnRpbWVzdGFtcCkudG9Mb2NhbGVTdHJpbmcoKX08L3A+XFxuICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICB7cG9zdC5zb3VyY2VVcmwgJiYgKFxcbiAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gd2luZG93Lm9wZW4ocG9zdC5zb3VyY2VVcmwsICdfYmxhbmsnKX0gY2xhc3NOYW1lPVxcXCJiZy1yZWQtNjAwIHRleHQtd2hpdGUgcHgtNiBweS0zIHJvdW5kZWQteGwgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgdGV4dC1bMTBweF0gZm9udC1ibGFjayB1cHBlcmNhc2Ugc2hhZG93LXhsIGFjdGl2ZTpzY2FsZS05NVxcXCI+XFxuICAgICAgICAgICAgICAgICAgPEV4dGVybmFsTGluayBzaXplPXsxNH0vPiB7dC52aWV3RnJvbVNvdXJjZX1cXG4gICAgICAgICAgICAgICA8L2J1dHRvbj5cXG4gICAgICAgICAgICAgKX1cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJncmlkIGdhcC02IHNtOmdhcC0xMFxcXCI+XFxuICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cXFwidGV4dC1zbSBzbTp0ZXh0LXhsIHRleHQtZ3JheS0zMDAgbGVhZGluZy1yZWxheGVkIHRleHQtanVzdGlmeSBicmVhay13b3JkcyB3aGl0ZXNwYWNlLXByZS13cmFwXFxcIj57cG9zdC5jb250ZW50fTwvcD5cXG4gICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImdyaWQgZ3JpZC1jb2xzLTEgc206Z3JpZC1jb2xzLTIgZ2FwLTQgc206Z2FwLTZcXFwiPlxcbiAgICAgICAgICAgICAgICB7cG9zdC5pbWFnZXMgJiYgcG9zdC5pbWFnZXMubWFwKChpbWcsIGkpID0+IChcXG4gICAgICAgICAgICAgICAgICAgPGRpdiBrZXk9e2l9IGNsYXNzTmFtZT1cXFwicm91bmRlZC0yeGwgc206cm91bmRlZC1bM3JlbV0gb3ZlcmZsb3ctaGlkZGVuIGJvcmRlciBib3JkZXItd2hpdGUvNSBzaGFkb3ctMnhsIGJnLWJsYWNrLzIwXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgPGltZyBzcmM9e2ltZ30gY2xhc3NOYW1lPVxcXCJ3LWZ1bGwgaC1hdXRvIG9iamVjdC1jb3ZlciBob3ZlcjpzY2FsZS0xMDUgdHJhbnNpdGlvbi10cmFuc2Zvcm0gZHVyYXRpb24tMTAwMFxcXCIgbG9hZGluZz1cXFwibGF6eVxcXCIgLz5cXG4gICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICkpfVxcbiAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gICk7XFxufTtcXG5cXG5jb25zdCBFeHRlbnNpdmVDb250ZW50ID0gKHsgdGl0bGUsIGNvbnRlbnQgfTogeyB0aXRsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcgfSkgPT4ge1xcbiAgcmV0dXJuIChcXG4gICAgPGRpdiBjbGFzc05hbWU9XFxcIm1heC13LTZ4bCBteC1hdXRvIHB0LTEyIHNwYWNlLXktMTIgYW5pbWF0ZS1mYWRlLWluIHB4LTQgcGItMjBcXFwiPlxcbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwic3BhY2UteS00IHRleHQtY2VudGVyXFxcIj5cXG4gICAgICAgICAgPGgyIGNsYXNzTmFtZT1cXFwidGV4dC0zeGwgc206dGV4dC04eGwgZm9udC1ibGFjayB0ZXh0LXdoaXRlIGxvZ28tdGV4dC1nbG93IHVwcGVyY2FzZSB0cmFja2luZy10aWdodGVyIGxlYWRpbmctdGlnaHRcXFwiPnt0aXRsZX08L2gyPlxcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwidy0yMCBzbTp3LTQwIGgtMS41IHNtOmgtMiBiZy1yZWQtNjAwIG14LWF1dG8gcm91bmRlZC1mdWxsXFxcIj48L2Rpdj5cXG4gICAgICAgPC9kaXY+XFxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJiZy1ibGFjay80MCBiYWNrZHJvcC1ibHVyLTN4bCBwLTYgc206cC0yMCByb3VuZGVkLVsycmVtXSBzbTpyb3VuZGVkLVs1cmVtXSBib3JkZXIgYm9yZGVyLXdoaXRlLzUgc2hhZG93LTJ4bCBsZWFkaW5nLWxvb3NlIHRleHQteHMgc206dGV4dC14bCB0ZXh0LWdyYXktNDAwIHNwYWNlLXktOCB0ZXh0LWp1c3RpZnlcXFwiPlxcbiAgICAgICAgICB7Y29udGVudC5zcGxpdCgnXFxcXG5cXFxcbicpLm1hcCgocGFyYSwgaSkgPT4gPHAga2V5PXtpfT57cGFyYX08L3A+KX1cXG4gICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgKTtcXG59O1xcblxcbmNvbnN0IFNpZGVNZW51ID0gKCkgPT4ge1xcbiAgY29uc3QgeyBpc01lbnVPcGVuLCBzZXRJc01lbnVPcGVuLCB0LCBzZXRWaWV3LCB1c2VyLCBpc0FkbWluLCBpc0xvZ2dlZCwgc2V0SXNMb2dnZWQsIHNldFNob3dMb2dpbiwgcmVtYWluaW5nTXMgfSA9IHVzZUNvbnRleHQoQXBwQ29udGV4dCk7XFxuICBpZiAoIWlzTWVudU9wZW4pIHJldHVybiBudWxsO1xcbiAgY29uc3QgZm9ybWF0VGltZSA9IChtczogbnVtYmVyKSA9PiB7XFxuICAgIGNvbnN0IHMgPSBNYXRoLmZsb29yKG1zIC8gMTAwMCk7XFxuICAgIGNvbnN0IGQgPSBNYXRoLmZsb29yKHMgLyA4NjQwMCk7XFxuICAgIGNvbnN0IGggPSBNYXRoLmZsb29yKChzICUgODY0MDApIC8gMzYwMCk7XFxuICAgIGNvbnN0IG0gPSBNYXRoLmZsb29yKChzICUgMzYwMCkgLyA2MCk7XFxuICAgIGNvbnN0IHNlYyA9IHMgJSA2MDtcXG4gICAgcmV0dXJuIGAke2R9JHt0LmRheXN9ICR7aH06JHttfToke3NlY31gO1xcbiAgfTtcXG5cXG4gIHJldHVybiAoXFxuICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmaXhlZCBpbnNldC0wIHotWzYwMF0gZmxleCBqdXN0aWZ5LXN0YXJ0IGFuaW1hdGUtZmFkZS1pblxcXCI+XFxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmaXhlZCBpbnNldC0wIGJnLWJsYWNrLzkwIGJhY2tkcm9wLWJsdXItbWRcXFwiIG9uQ2xpY2s9eygpID0+IHNldElzTWVudU9wZW4oZmFsc2UpfT48L2Rpdj5cXG4gICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInJlbGF0aXZlIHctWzgwdnddIHNtOnctOTYgaC1mdWxsIGJnLVsjMDUwNTA1XSBib3JkZXItbCBib3JkZXItd2hpdGUvMTAgc2hhZG93LTJ4bCBwLTYgc206cC0xMCBmbGV4IGZsZXgtY29sIGFuaW1hdGUtc2xpZGUtaW4tcmlnaHRcXFwiPlxcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyIG1iLTEwIHNtOm1iLTE2XFxcIj5cXG4gICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggaXRlbXMtY2VudGVyIGdhcC0zXFxcIj5cXG4gICAgICAgICAgICAgICA8aW1nIHNyYz17TE9HT19VUkx9IHJlZmVycmVyUG9saWN5PVxcXCJuby1yZWZlcnJlclxcXCIgY2xhc3NOYW1lPVxcXCJ3LTEwIGgtMTAgc206dy0xNiBzbTpoLTE2IHJvdW5kZWQteGwgYm9yZGVyLTIgYm9yZGVyLXJlZC02MDAgc2hhZG93LTJ4bCBmaXJlLWdsb3dcXFwiIC8+XFxuICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVxcXCJmb250LWJsYWNrIHRleHQtc20gc206dGV4dC1sZyB0cmFja2luZy10aWdodGVyIGxvZ28tdGV4dC1nbG93IHVwcGVyY2FzZVxcXCI+QTRHaWFudDwvc3Bhbj5cXG4gICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gc2V0SXNNZW51T3BlbihmYWxzZSl9IGNsYXNzTmFtZT1cXFwidGV4dC1ncmF5LTUwMCBob3Zlcjp0ZXh0LXdoaXRlIHRyYW5zaXRpb24tYWxsXFxcIj48WCBzaXplPXsyOH0vPjwvYnV0dG9uPlxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInNwYWNlLXktMyBzbTpzcGFjZS15LTggZmxleC0xIG92ZXJmbG93LXktYXV0byBzY3JvbGxiYXItaGlkZVxcXCI+XFxuICAgICAgICAgICAgIHtpc0xvZ2dlZCAmJiB1c2VyPy5pc1N1YnNjcmliZWQgJiYgKFxcbiAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJiZy1yZWQtNjAwLzEwIGJvcmRlciBib3JkZXItcmVkLTYwMC8yMCBwLTQgcm91bmRlZC0yeGwgbWItNCB0ZXh0LWNlbnRlciBzcGFjZS15LTJcXFwiPlxcbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cXFwidGV4dC1bMTBweF0gZm9udC1ibGFjayB0ZXh0LXJlZC01MDAgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVzdFxcXCI+e3QudGltZUxlZnR9PC9wPlxcbiAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cXFwidGV4dC14bCBmb250LWJsYWNrIHRleHQtd2hpdGUgZm9udC1tb25vXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIHtyZW1haW5pbmdNcyA+IDAgPyBmb3JtYXRUaW1lKHJlbWFpbmluZ01zKSA6IFxcXCLYp9mG2KrZh9mJINin2YTYp9i02KrYsdin2YMgLSDZitix2KzZiSDYp9mE2KrYrNiv2YrYr1xcXCJ9XFxuICAgICAgICAgICAgICAgICAgPC9wPlxcbiAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICApfVxcbiAgICAgICAgICAgICB7aXNMb2dnZWQgJiYgIXVzZXI/LmlzU3Vic2NyaWJlZCAmJiAoXFxuICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImJnLXdoaXRlLzUgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBwLTQgcm91bmRlZC0yeGwgbWItNCB0ZXh0LWNlbnRlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVxcXCJ0ZXh0LVsxMHB4XSBmb250LWJsYWNrIHRleHQtZ3JheS01MDAgdXBwZXJjYXNlXFxcIj57dC5zdWJzY3JpYmVQcm9tcHR9PC9wPlxcbiAgICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4geyBzZXRWaWV3KCdzdXBlci1naWFudCcpOyBzZXRJc01lbnVPcGVuKGZhbHNlKTsgfX0gY2xhc3NOYW1lPVxcXCJtdC0yIHRleHQtcmVkLTUwMCBmb250LWJsYWNrIHRleHQteHMgdXBwZXJjYXNlIHVuZGVybGluZVxcXCI+e3Quc3Vic2NyaWJlTm93fTwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICApfVxcbiAgICAgICAgICAgICB7W1xcbiAgICAgICAgICAgICAgIHtpZDogJ2hvbWUnLCBpY29uOiBIb21lLCBsYWJlbDogdC5ob21lfSxcXG4gICAgICAgICAgICAgICB7aWQ6ICdwb3N0cy1saXN0JywgaWNvbjogTmV3c3BhcGVyLCBsYWJlbDogdC5wb3N0c1RpdGxlfSxcXG4gICAgICAgICAgICAgICB7aWQ6ICdwcm9maWxlJywgaWNvbjogU2V0dGluZ3MsIGxhYmVsOiB0LnlvdXJBY2NvdW50fSxcXG4gICAgICAgICAgICAgICB7aWQ6ICdzdXBlci1naWFudCcsIGljb246IEZsYW1lLCBsYWJlbDogdC5wcmVtaXVtfSxcXG4gICAgICAgICAgICAgICB7aWQ6ICdub3ZlbHMnLCBpY29uOiBCb29rT3BlbiwgbGFiZWw6IHQubm92ZWxzfSxcXG4gICAgICAgICAgICAgICB7aWQ6ICdmb3J1bScsIGljb246IE1lc3NhZ2VTcXVhcmUsIGxhYmVsOiB0LmZvcnVtfSxcXG4gICAgICAgICAgICAgICB7aWQ6ICdub3RpZmljYXRpb25zJywgaWNvbjogQmVsbCwgbGFiZWw6IHQubm90aWZpY2F0aW9uc30sXFxuICAgICAgICAgICAgICAge2lkOiAnYWJvdXQtdXMnLCBpY29uOiBJbmZvLCBsYWJlbDogdC5hYm91dFVzfSxcXG4gICAgICAgICAgICAgICB7aWQ6ICdjb250YWN0LXVzJywgaWNvbjogUGhvbmVDYWxsLCBsYWJlbDogdC5jb250YWN0VXN9LFxcbiAgICAgICAgICAgICAgIHtpZDogJ3Rlcm1zLWNvbmRpdGlvbnMnLCBpY29uOiBTaGllbGRBbGVydCwgbGFiZWw6IHQudGVybXN9LFxcbiAgICAgICAgICAgICAgIHtpZDogJ3ByaXZhY3ktcG9saWN5JywgaWNvbjogU2hpZWxkQ2hlY2ssIGxhYmVsOiB0LnByaXZhY3lQb2xpY3l9LFxcbiAgICAgICAgICAgICBdLm1hcChtID0+IChcXG4gICAgICAgICAgICAgICA8YnV0dG9uIGtleT17bS5pZH0gb25DbGljaz17KCkgPT4geyBzZXRWaWV3KG0uaWQgYXMgYW55KTsgc2V0SXNNZW51T3BlbihmYWxzZSk7IH19IGNsYXNzTmFtZT1cXFwidy1mdWxsIHB5LTMgc206cHktNSBweC00IHNtOnB4LTggcm91bmRlZC14bCBiZy13aGl0ZS81IGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBncm91cCBob3ZlcjpiZy1yZWQtNjAwLzEwIHRyYW5zaXRpb24tYWxsIGJvcmRlciBib3JkZXItdHJhbnNwYXJlbnQgaG92ZXI6Ym9yZGVyLXJlZC02MDAvMjBcXFwiPlxcbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cXFwiZm9udC1ibGFjayB0ZXh0LXhzIHNtOnRleHQteGwgdGV4dC13aGl0ZSBncm91cC1ob3Zlcjp0ZXh0LXJlZC01MDBcXFwiPnttLmxhYmVsfTwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICA8bS5pY29uIGNsYXNzTmFtZT1cXFwidGV4dC1ncmF5LTYwMCBncm91cC1ob3Zlcjp0ZXh0LXJlZC01MDBcXFwiIHNpemU9ezE4fSAvPlxcbiAgICAgICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgICAgICApKX1cXG4gICAgICAgICAgICAgeyFpc0xvZ2dlZCAmJiAoXFxuICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiB7IHNldFNob3dMb2dpbih0cnVlKTsgc2V0SXNNZW51T3BlbihmYWxzZSk7IH19IGNsYXNzTmFtZT1cXFwidy1mdWxsIHB5LTQgc206cHktNiBweC00IHNtOnB4LTggcm91bmRlZC14bCBiZy1yZWQtNjAwIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBncm91cCBob3ZlcjpzY2FsZS1bMS4wMl0gdHJhbnNpdGlvbi1hbGwgc2hhZG93LXhsXFxcIj5cXG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XFxcImZvbnQtYmxhY2sgdGV4dC14cyBzbTp0ZXh0LXhsIHRleHQtd2hpdGUgdXBwZXJjYXNlXFxcIj57dC5qb2luVXN9PC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgIDxVc2VyUGx1cyBjbGFzc05hbWU9XFxcInRleHQtd2hpdGVcXFwiIHNpemU9ezE4fSAvPlxcbiAgICAgICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgICAgICApfVxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAge2lzTG9nZ2VkICYmIChcXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwibXQtYXV0byBwdC02IGJvcmRlci10IGJvcmRlci13aGl0ZS81IHNwYWNlLXktNFxcXCI+XFxuICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIHAtNCBiZy13aGl0ZS81IHJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItd2hpdGUvMTAgc2hhZG93LWxnXFxcIj5cXG4gICAgICAgICAgICAgICAgICA8aW1nIHNyYz17dXNlcj8ucGhvdG9Vcmx9IGNsYXNzTmFtZT1cXFwidy0xMCBoLTEwIHNtOnctMTQgcm91bmRlZC14bCBib3JkZXItMiBib3JkZXItcmVkLTYwMCBvYmplY3QtY292ZXJcXFwiIC8+XFxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXgtMSBvdmVyZmxvdy1oaWRkZW4gdGV4dC1yaWdodFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XFxcImZvbnQtYmxhY2sgdGV4dC13aGl0ZSB0ZXh0LVsxMHB4XSBzbTp0ZXh0LWxnIHRydW5jYXRlXFxcIj57dXNlcj8ubmFtZX08L3A+XFxuICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XFxcInRleHQtWzdweF0gc206dGV4dC1bMTBweF0gZm9udC1ibGFjayB0ZXh0LXJlZC02MDAgdXBwZXJjYXNlIG10LTAuNVxcXCI+e2lzQWRtaW4gPyB0LmFkbWluUmFuayA6IHQudXNlclJhbmt9PC9wPlxcbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4geyBzZXRJc0xvZ2dlZChmYWxzZSk7IGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdnaWFudF9sb2dnZWQnLCAnZmFsc2UnKTsgc2V0SXNNZW51T3BlbihmYWxzZSk7IH19IGNsYXNzTmFtZT1cXFwidy1mdWxsIHB5LTMgdGV4dC1yZWQtNTAwIGZvbnQtYmxhY2sgdXBwZXJjYXNlIHRleHQtWzhweF0gc206dGV4dC1bMTBweF0gZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTIgaG92ZXI6YmctcmVkLTYwMC8xMCByb3VuZGVkLXhsIHRyYW5zaXRpb24tYWxsXFxcIj5cXG4gICAgICAgICAgICAgICAgICA8TG9nT3V0IHNpemU9ezE2fS8+IHt0LmxvZ291dH1cXG4gICAgICAgICAgICAgICA8L2J1dHRvbj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgKX1cXG4gICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgKTtcXG59O1xcblxcbmNvbnN0IEpvaW5Qb3J0YWwgPSAoeyBvbkNsb3NlIH06IHsgb25DbG9zZTogKCkgPT4gdm9pZCB9KSA9PiB7XFxuICBjb25zdCB7IHQsIHVzZXIsIHBsYW5zLCBzZXRJc0xvZ2dlZCwgbG9naW5XaXRoTGlua0tleSB9ID0gdXNlQ29udGV4dChBcHBDb250ZXh0KTtcXG4gIGNvbnN0IFtuYW1lLCBzZXROYW1lXSA9IHVzZVN0YXRlKHVzZXI/Lm5hbWUgfHwgXFxcIlxcXCIpO1xcbiAgY29uc3QgW3Bob3RvLCBzZXRQaG90b10gPSB1c2VTdGF0ZSh1c2VyPy5waG90b1VybCB8fCBMT0dPX1VSTCk7XFxuICBjb25zdCBbcGxhblR5cGUsIHNldFBsYW5UeXBlXSA9IHVzZVN0YXRlKFxcXCJcXFwiKTtcXG4gIGNvbnN0IFtpbnB1dEtleSwgc2V0SW5wdXRLZXldID0gdXNlU3RhdGUoXFxcIlxcXCIpO1xcbiAgY29uc3QgW3Nob3dLZXlMb2dpbiwgc2V0U2hvd0tleUxvZ2luXSA9IHVzZVN0YXRlKGZhbHNlKTtcXG5cXG4gIGNvbnN0IGhhbmRsZUxvZ2luID0gYXN5bmMgKCkgPT4ge1xcbiAgICBpZiAoIW5hbWUudHJpbSgpKSB7XFxuICAgICAgYWxlcnQodC5kaXIgPT09ICdydGwnID8gXFxcItmK2LHYrNmJINil2K/Yrtin2YQg2KfYs9mF2YMg2KPZiNmE2KfZiyFcXFwiIDogXFxcIlBsZWFzZSBlbnRlciB5b3VyIG5hbWUgZmlyc3QhXFxcIik7XFxuICAgICAgcmV0dXJuO1xcbiAgICB9XFxuICAgIGlmICghdXNlcj8uaWQpIHJldHVybjtcXG4gICAgXFxuICAgIHRyeSB7XFxuICAgICAgYXdhaXQgdXBkYXRlRG9jKGRvYyhkYiwgJ3VzZXJzJywgdXNlci5pZCksIHsgbmFtZSwgcGhvdG9Vcmw6IHBob3RvIH0pO1xcbiAgICB9IGNhdGNoIChlKSB7XFxuICAgICAgY29uc29sZS5lcnJvcihcXFwiRXJyb3IgdXBkYXRpbmcgdXNlcjpcXFwiLCBlKTtcXG4gICAgfVxcbiAgICBcXG4gICAgc2V0SXNMb2dnZWQodHJ1ZSk7XFxuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdnaWFudF9sb2dnZWQnLCAndHJ1ZScpO1xcbiAgICBvbkNsb3NlKCk7XFxuICB9O1xcblxcbiAgY29uc3QgaGFuZGxlS2V5TG9naW4gPSBhc3luYyAoKSA9PiB7XFxuICAgIGlmICghaW5wdXRLZXkudHJpbSgpKSByZXR1cm47XFxuICAgIGNvbnN0IHN1Y2Nlc3MgPSBhd2FpdCBsb2dpbldpdGhMaW5rS2V5KGlucHV0S2V5LnRyaW0oKSk7XFxuICAgIGlmIChzdWNjZXNzKSB7XFxuICAgICAgb25DbG9zZSgpO1xcbiAgICB9IGVsc2Uge1xcbiAgICAgIGFsZXJ0KHQuZGlyID09PSAncnRsJyA/IFxcXCLZhdmB2KrYp9itINin2YTYsdio2Lcg2LrZitixINi12K3ZititIVxcXCIgOiBcXFwiSW52YWxpZCBMaW5rIEtleSFcXFwiKTtcXG4gICAgfVxcbiAgfTtcXG5cXG4gIGNvbnN0IGhhbmRsZVJlcXVlc3QgPSBhc3luYyAoKSA9PiB7XFxuICAgIGlmICghbmFtZS50cmltKCkpIHtcXG4gICAgICBhbGVydCh0LmRpciA9PT0gJ3J0bCcgPyBcXFwi2YrYsdis2Ykg2KXYr9iu2KfZhCDYp9iz2YXZgyDYo9mI2YTYp9mLIVxcXCIgOiBcXFwiUGxlYXNlIGVudGVyIHlvdXIgbmFtZSBmaXJzdCFcXFwiKTtcXG4gICAgICByZXR1cm47XFxuICAgIH1cXG4gICAgaWYgKCFwbGFuVHlwZSB8fCAhdXNlcj8uaWQpIHJldHVybjtcXG4gICAgXFxuICAgIGNvbnN0IHBsYW4gPSBwbGFucy5maW5kKChwOiBhbnkpID0+IHAubmFtZSA9PT0gcGxhblR5cGUpO1xcbiAgICBpZiAoIXBsYW4pIHJldHVybjtcXG5cXG4gICAgbGV0IGlwID0gXFxcIti62YrYsSDZhdi52LHZiNmBXFxcIjtcXG4gICAgdHJ5IHtcXG4gICAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaCgnaHR0cHM6Ly9hcGkuaXBpZnkub3JnP2Zvcm1hdD1qc29uJyk7XFxuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlcy5qc29uKCk7XFxuICAgICAgaXAgPSBkYXRhLmlwO1xcbiAgICB9IGNhdGNoIChlKSB7fVxcblxcbiAgICBjb25zdCBtZXNzYWdlID0gYNi32YTYqCDYp9i02KrYsdin2YMg2KzYr9mK2K8g2YHZiiDYudin2YTZhSDYp9mE2LnZhdin2YTZgtipOlxcbtin2LPZhSDYp9mE2LnZhdmE2KfZgjogJHtuYW1lfVxcbklEINin2YTYudmF2YTYp9mCOiAke3VzZXIuaWR9XFxuSVAg2KfZhNis2YfYp9iyOiAke2lwfVxcbtin2YTYqNin2YLYqSDYp9mE2YXYt9mE2YjYqNipOiAke3BsYW4ubmFtZX1cXG7Yp9mE2LPYudixOiAke3BsYW4ucHJpY2V9ICR7dC5sZX1gO1xcblxcbiAgICBjb25zdCB3aGF0c2FwcFVybCA9IGBodHRwczovL3dhLm1lLyR7cGxhbi53aGF0c2FwcC5yZXBsYWNlKCcrJywgJycpfT90ZXh0PSR7ZW5jb2RlVVJJQ29tcG9uZW50KG1lc3NhZ2UpfWA7XFxuXFxuICAgIHRyeSB7XFxuICAgICAgYXdhaXQgdXBkYXRlRG9jKGRvYyhkYiwgJ3VzZXJzJywgdXNlci5pZCksIHsgbmFtZSwgcGhvdG9Vcmw6IHBob3RvIH0pO1xcbiAgICAgIGF3YWl0IGFkZERvYyhjb2xsZWN0aW9uKGRiLCAnc3Vic2NyaXB0aW9uX3JlcXVlc3RzJyksIHtcXG4gICAgICAgIHVzZXJJZDogdXNlci5pZCxcXG4gICAgICAgIHVzZXJOYW1lOiBuYW1lLFxcbiAgICAgICAgcGxhblR5cGU6IHBsYW5UeXBlLFxcbiAgICAgICAgaXA6IGlwLFxcbiAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpXFxuICAgICAgfSk7XFxuICAgIH0gY2F0Y2ggKGUpIHtcXG4gICAgICBjb25zb2xlLmVycm9yKFxcXCJFcnJvciBpbiBoYW5kbGVSZXF1ZXN0OlxcXCIsIGUpO1xcbiAgICB9XFxuICAgIFxcbiAgICB3aW5kb3cub3Blbih3aGF0c2FwcFVybCwgJ19ibGFuaycpO1xcbiAgICBhbGVydChcXFwi2KrZhSDYqtmI2KzZitmH2YMg2YTZhNmI2KfYqtiz2KfYqCDZhNiq2KPZg9mK2K8g2KfZhNin2LTYqtix2KfZgyDZhdi5INin2YTYpdiv2KfYsdipIVxcXCIpO1xcbiAgICBzZXRJc0xvZ2dlZCh0cnVlKTtcXG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2dpYW50X2xvZ2dlZCcsICd0cnVlJyk7XFxuICAgIG9uQ2xvc2UoKTtcXG4gIH07XFxuXFxuICByZXR1cm4gKFxcbiAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZml4ZWQgaW5zZXQtMCB6LVsyMDAwXSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBwLTRcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmaXhlZCBpbnNldC0wIGJnLWJsYWNrLzk1IGJhY2tkcm9wLWJsdXIteGxcXFwiIG9uQ2xpY2s9e29uQ2xvc2V9PjwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJyZWxhdGl2ZSB3LWZ1bGwgbWF4LXctbGcgYmctWyMwYTBhMGFdIGJvcmRlciBib3JkZXItd2hpdGUvMTAgcC04IHNtOnAtMTIgcm91bmRlZC1bM3JlbV0gc2hhZG93LTJ4bCBzcGFjZS15LTggYW5pbWF0ZS1zY2FsZS1pbiBvdmVyZmxvdy15LWF1dG8gbWF4LWgtWzkwdmhdIHNjcm9sbGJhci1oaWRlXFxcIj5cXG4gICAgICAgIDxidXR0b24gb25DbGljaz17b25DbG9zZX0gY2xhc3NOYW1lPVxcXCJhYnNvbHV0ZSB0b3AtNiBsZWZ0LTYgdGV4dC1ncmF5LTUwMCBob3Zlcjp0ZXh0LXdoaXRlXFxcIj48WCBzaXplPXsyNH0vPjwvYnV0dG9uPlxcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInRleHQtY2VudGVyIHNwYWNlLXktNFxcXCI+XFxuICAgICAgICAgICA8aW1nIHNyYz17TE9HT19VUkx9IHJlZmVycmVyUG9saWN5PVxcXCJuby1yZWZlcnJlclxcXCIgY2xhc3NOYW1lPVxcXCJ3LTIwIGgtMjAgbXgtYXV0byByb3VuZGVkLTJ4bCBib3JkZXItMiBib3JkZXItcmVkLTYwMCBmaXJlLWdsb3dcXFwiIC8+XFxuICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVxcXCJ0ZXh0LTN4bCBmb250LWJsYWNrIHRleHQtd2hpdGUgbG9nby10ZXh0LWdsb3cgdXBwZXJjYXNlXFxcIj57dC5sb2dpblRpdGxlfTwvaDI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJzcGFjZS15LTZcXFwiPlxcbiAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggZ2FwLTIgcC0xIGJnLXdoaXRlLzUgcm91bmRlZC14bFxcXCI+XFxuICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHNldFNob3dLZXlMb2dpbihmYWxzZSl9IGNsYXNzTmFtZT17YGZsZXgtMSBweS0yIHJvdW5kZWQtbGcgdGV4dC1bMTBweF0gZm9udC1ibGFjayB1cHBlcmNhc2UgdHJhbnNpdGlvbi1hbGwgJHshc2hvd0tleUxvZ2luID8gJ2JnLXJlZC02MDAgdGV4dC13aGl0ZScgOiAndGV4dC1ncmF5LTUwMCd9YH0+e3Quam9pblVzfTwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBzZXRTaG93S2V5TG9naW4odHJ1ZSl9IGNsYXNzTmFtZT17YGZsZXgtMSBweS0yIHJvdW5kZWQtbGcgdGV4dC1bMTBweF0gZm9udC1ibGFjayB1cHBlcmNhc2UgdHJhbnNpdGlvbi1hbGwgJHtzaG93S2V5TG9naW4gPyAnYmctcmVkLTYwMCB0ZXh0LXdoaXRlJyA6ICd0ZXh0LWdyYXktNTAwJ31gfT57dC5rZXlMb2dpbn08L2J1dHRvbj5cXG4gICAgICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgICAgeyFzaG93S2V5TG9naW4gPyAoXFxuICAgICAgICAgICAgIDw+XFxuICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInNwYWNlLXktMlxcXCI+XFxuICAgICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cXFwidGV4dC1bMTBweF0gZm9udC1ibGFjayB0ZXh0LWdyYXktNTAwIHVwcGVyY2FzZSBweC0yXFxcIj57dC55b3VyTmFtZX08L2xhYmVsPlxcbiAgICAgICAgICAgICAgICAgIDxpbnB1dCB2YWx1ZT17bmFtZX0gb25DaGFuZ2U9e2UgPT4gc2V0TmFtZShlLnRhcmdldC52YWx1ZSl9IGNsYXNzTmFtZT1cXFwidy1mdWxsIGJnLXdoaXRlLzUgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBwLTQgcm91bmRlZC0yeGwgdGV4dC13aGl0ZSBvdXRsaW5lLW5vbmUgZm9jdXM6Ym9yZGVyLXJlZC02MDAgdHJhbnNpdGlvbi1hbGwgZm9udC1ib2xkXFxcIiAvPlxcbiAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgIDxGaWxlSW5wdXQgbGFiZWw9e3QudXBsb2FkSW1nfSB2YWx1ZT17cGhvdG99IG9uVmFsdWVDaGFuZ2U9e3NldFBob3RvfSBwbGFjZWhvbGRlcj1cXFwiVVJMXFxcIiAvPlxcbiAgICAgICAgICAgICAgIFxcbiAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJzcGFjZS15LTQgcHQtNFxcXCI+XFxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHRleHQtcmVkLTYwMFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgPFNoaWVsZEFsZXJ0IHNpemU9ezE2fS8+XFxuICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVxcXCJ0ZXh0LVsxMHB4XSBmb250LWJsYWNrIHVwcGVyY2FzZSB0cmFja2luZy13aWRlc3RcXFwiPnt0LnN1YnNjcmliZU5vd308L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImdyaWQgZ2FwLTJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgIHtwbGFucy5tYXAoKHA6IGFueSkgPT4gKFxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24ga2V5PXtwLmlkfSBvbkNsaWNrPXsoKSA9PiBzZXRQbGFuVHlwZShwLm5hbWUpfSBjbGFzc05hbWU9e2BwLTQgcm91bmRlZC14bCBib3JkZXIgZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyIHRyYW5zaXRpb24tYWxsICR7cGxhblR5cGUgPT09IHAubmFtZSA/ICdiZy1yZWQtNjAwIGJvcmRlci1yZWQtNTAwIHRleHQtd2hpdGUnIDogJ2JnLXdoaXRlLzUgYm9yZGVyLXdoaXRlLzEwIHRleHQtZ3JheS00MDAnfWB9PlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cXFwiZm9udC1ibGFjayB0ZXh0LXhzXFxcIj57cC5uYW1lfTwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XFxcInRleHQtWzEwcHhdIGZvbnQtYm9sZCBvcGFjaXR5LTYwXFxcIj57cC5wcmljZX0ge3QubGV9PC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICAgICAgICkpfVxcbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGZsZXgtY29sIGdhcC0zIHB0LTZcXFwiPlxcbiAgICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17cGxhblR5cGUgPyBoYW5kbGVSZXF1ZXN0IDogaGFuZGxlTG9naW59IGNsYXNzTmFtZT1cXFwidy1mdWxsIGJnLXJlZC02MDAgcHktNSByb3VuZGVkLVsycmVtXSBmb250LWJsYWNrIHRleHQtd2hpdGUgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVzdCBzaGFkb3ctMnhsIHNoYWRvdy1yZWQtNjAwLzIwIGFjdGl2ZTpzY2FsZS05NSB0cmFuc2l0aW9uLWFsbFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAge3BsYW5UeXBlID8gdC5zdWJzY3JpYmVOb3cgOiB0LmVudGVyV29ybGR9XFxuICAgICAgICAgICAgICAgICAgPC9idXR0b24+XFxuICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgIDwvPlxcbiAgICAgICAgICAgKSA6IChcXG4gICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInNwYWNlLXktNiBweS00XFxcIj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInNwYWNlLXktMlxcXCI+XFxuICAgICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzc05hbWU9XFxcInRleHQtWzEwcHhdIGZvbnQtYmxhY2sgdGV4dC1ncmF5LTUwMCB1cHBlcmNhc2UgcHgtMlxcXCI+e3QubGlua0tleX08L2xhYmVsPlxcbiAgICAgICAgICAgICAgICAgICA8aW5wdXQgdmFsdWU9e2lucHV0S2V5fSBvbkNoYW5nZT17ZSA9PiBzZXRJbnB1dEtleShlLnRhcmdldC52YWx1ZSl9IHBsYWNlaG9sZGVyPXt0LmVudGVyS2V5fSBjbGFzc05hbWU9XFxcInctZnVsbCBiZy13aGl0ZS81IGJvcmRlciBib3JkZXItd2hpdGUvMTAgcC00IHJvdW5kZWQtMnhsIHRleHQtd2hpdGUgb3V0bGluZS1ub25lIGZvY3VzOmJvcmRlci1yZWQtNjAwIHRyYW5zaXRpb24tYWxsIGZvbnQtYm9sZCB0ZXh0LWNlbnRlciB0cmFja2luZy13aWRlc3RcXFwiIC8+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9e2hhbmRsZUtleUxvZ2lufSBjbGFzc05hbWU9XFxcInctZnVsbCBiZy1yZWQtNjAwIHB5LTUgcm91bmRlZC1bMnJlbV0gZm9udC1ibGFjayB0ZXh0LXdoaXRlIHVwcGVyY2FzZSB0cmFja2luZy13aWRlc3Qgc2hhZG93LTJ4bCBzaGFkb3ctcmVkLTYwMC8yMCBhY3RpdmU6c2NhbGUtOTUgdHJhbnNpdGlvbi1hbGxcXFwiPlxcbiAgICAgICAgICAgICAgICAgICB7dC5sb2dpbldpdGhLZXl9XFxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICl9XFxuXFxuICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBmbGV4LWNvbCBnYXAtM1xcXCI+XFxuICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHdpbmRvdy5vcGVuKCdodHRwczovL3dhLm1lLycsICdfYmxhbmsnKX0gY2xhc3NOYW1lPVxcXCJ3LWZ1bGwgcHktNCB0ZXh0LWdyYXktNTAwIGZvbnQtYmxhY2sgdGV4dC1bMTBweF0gdXBwZXJjYXNlIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0yIGhvdmVyOnRleHQtd2hpdGUgdHJhbnNpdGlvbi1hbGxcXFwiPlxcbiAgICAgICAgICAgICAgICAgPFBob25lQ2FsbCBzaXplPXsxNH0vPiB7dC5jb250YWN0VXN9XFxuICAgICAgICAgICAgICA8L2J1dHRvbj5cXG4gICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgKTtcXG59O1xcblxcbmNvbnN0IENvbW1lbnRzU2VjdGlvbiA9ICh7IG1lZGlhSWQsIG1lZGlhVGl0bGUgfTogeyBtZWRpYUlkOiBzdHJpbmcsIG1lZGlhVGl0bGU6IHN0cmluZyB9KSA9PiB7XFxuICBjb25zdCB7IHQsIHVzZXIsIGlzQWRtaW4gfSA9IHVzZUNvbnRleHQoQXBwQ29udGV4dCk7XFxuICBjb25zdCBbY29tbWVudHMsIHNldENvbW1lbnRzXSA9IHVzZVN0YXRlPENvbW1lbnRbXT4oW10pO1xcbiAgY29uc3QgW3RleHQsIHNldFRleHRdID0gdXNlU3RhdGUoXFxcIlxcXCIpO1xcbiAgY29uc3QgW2lzU2VuZGluZywgc2V0SXNTZW5kaW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcXG5cXG4gIHVzZUVmZmVjdCgoKSA9PiB7XFxuICAgIGNvbnN0IHEgPSBxdWVyeShjb2xsZWN0aW9uKGRiLCAnY29tbWVudHMnKSwgd2hlcmUoJ21lZGlhSWQnLCAnPT0nLCBtZWRpYUlkKSk7XFxuICAgIHJldHVybiBvblNuYXBzaG90KHEsIChzKSA9PiB7XFxuICAgICAgY29uc3QgZmV0Y2hlZCA9IHMuZG9jcy5tYXAoZCA9PiAoeyBpZDogZC5pZCwgLi4uZC5kYXRhKCkgfSBhcyBDb21tZW50KSk7XFxuICAgICAgc2V0Q29tbWVudHMoZmV0Y2hlZC5zb3J0KChhLCBiKSA9PiBiLnRpbWVzdGFtcCAtIGEudGltZXN0YW1wKSk7XFxuICAgIH0pO1xcbiAgfSwgW21lZGlhSWRdKTtcXG5cXG4gIGNvbnN0IGFkZENvbW1lbnQgPSBhc3luYyAoKSA9PiB7XFxuICAgIGlmICghdGV4dC50cmltKCkgfHwgIXVzZXIgfHwgaXNTZW5kaW5nKSByZXR1cm47XFxuICAgIHNldElzU2VuZGluZyh0cnVlKTtcXG4gICAgdHJ5IHtcXG4gICAgICBhd2FpdCBhZGREb2MoY29sbGVjdGlvbihkYiwgJ2NvbW1lbnRzJyksIHtcXG4gICAgICAgIG1lZGlhSWQsIG1lZGlhVGl0bGUsIHVzZXJJZDogdXNlci5pZCwgdXNlck5hbWU6IHVzZXIubmFtZSwgdXNlclBob3RvOiB1c2VyLnBob3RvVXJsLFxcbiAgICAgICAgdGV4dCwgdGltZXN0YW1wOiBEYXRlLm5vdygpXFxuICAgICAgfSk7XFxuICAgICAgc2V0VGV4dChcXFwiXFxcIik7XFxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XFxuICAgICAgY29uc29sZS5lcnJvcihcXFwiRXJyb3IgYWRkaW5nIGNvbW1lbnQ6XFxcIiwgZXJyb3IpO1xcbiAgICAgIGFsZXJ0KFxcXCLYrdiv2Ksg2K7Yt9ijINij2KvZhtin2KEg2KXYttin2YHYqSDYp9mE2KrYudmE2YrZgi5cXFwiKTtcXG4gICAgfSBmaW5hbGx5IHtcXG4gICAgICBzZXRJc1NlbmRpbmcoZmFsc2UpO1xcbiAgICB9XFxuICB9O1xcblxcbiAgY29uc3QgZGVsZXRlQ29tbWVudCA9IGFzeW5jIChpZDogc3RyaW5nKSA9PiB7XFxuICAgIGlmICh3aW5kb3cuY29uZmlybShcXFwi2K3YsNmBINin2YTYqti52YTZitmC2J9cXFwiKSkgYXdhaXQgZGVsZXRlRG9jKGRvYyhkYiwgJ2NvbW1lbnRzJywgaWQpKTtcXG4gIH07XFxuXFxuICBjb25zdCByZXBseUNvbW1lbnQgPSBhc3luYyAoaWQ6IHN0cmluZykgPT4ge1xcbiAgICBjb25zdCByID0gcHJvbXB0KFxcXCLYp9mD2KrYqCDYp9mE2LHYrzpcXFwiKTtcXG4gICAgaWYgKHIpIGF3YWl0IHVwZGF0ZURvYyhkb2MoZGIsICdjb21tZW50cycsIGlkKSwgeyByZXBseVRleHQ6IHIgfSk7XFxuICB9O1xcblxcbiAgcmV0dXJuIChcXG4gICAgPGRpdiBjbGFzc05hbWU9XFxcInNwYWNlLXktMTAgc206c3BhY2UteS0xNiBhbmltYXRlLWZhZGUtaW5cXFwiPlxcbiAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTRcXFwiPlxcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwidy0xLjUgaC0xMCBiZy1yZWQtNjAwIHJvdW5kZWQtZnVsbFxcXCI+PC9kaXY+XFxuICAgICAgICAgIDxoMyBjbGFzc05hbWU9XFxcInRleHQteGwgc206dGV4dC00eGwgZm9udC1ibGFjayB0ZXh0LXdoaXRlIHVwcGVyY2FzZVxcXCI+e3QuY29tbWVudHN9PC9oMz5cXG4gICAgICAgPC9kaXY+XFxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJiZy13aGl0ZS9bMC4wMl0gcC00IHNtOnAtMTIgcm91bmRlZC1bMnJlbV0gc206cm91bmRlZC1bNHJlbV0gYm9yZGVyIGJvcmRlci13aGl0ZS81IHNwYWNlLXktOFxcXCI+XFxuICAgICAgICAgIHshdXNlciA/IChcXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwicC00IGJnLXJlZC02MDAvMTAgYm9yZGVyIGJvcmRlci1yZWQtNjAwLzIwIHJvdW5kZWQtMnhsIHRleHQtY2VudGVyXFxcIj5cXG4gICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XFxcInRleHQtcmVkLTUwMCBmb250LWJsYWNrIHVwcGVyY2FzZSB0ZXh0LVsxMHB4XVxcXCI+e3QubG9naW5Qcm9tcHR9PC9wPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICApIDogKFxcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGdhcC00IGl0ZW1zLWNlbnRlciBiZy1ibGFjay80MCBwLTIgc206cC00IHJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItd2hpdGUvMTAgZm9jdXMtd2l0aGluOmJvcmRlci1yZWQtNjAwIHRyYW5zaXRpb24tYWxsXFxcIj5cXG4gICAgICAgICAgICAgICA8aW5wdXQgdmFsdWU9e3RleHR9IG9uQ2hhbmdlPXtlID0+IHNldFRleHQoZS50YXJnZXQudmFsdWUpfSBkaXNhYmxlZD17aXNTZW5kaW5nfSBwbGFjZWhvbGRlcj17dC53cml0ZUNvbW1lbnR9IGNsYXNzTmFtZT1cXFwiZmxleC0xIGJnLXRyYW5zcGFyZW50IGJvcmRlci1ub25lIG91dGxpbmUtbm9uZSB0ZXh0LXhzIHNtOnRleHQtbGcgdGV4dC13aGl0ZSBkaXNhYmxlZDpvcGFjaXR5LTUwXFxcIiAvPlxcbiAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17YWRkQ29tbWVudH0gZGlzYWJsZWQ9e2lzU2VuZGluZ30gY2xhc3NOYW1lPVxcXCJiZy1yZWQtNjAwIHAtMiBzbTpwLTQgcm91bmRlZC14bCBzaGFkb3ctbGcgYWN0aXZlOnNjYWxlLTk1IHRyYW5zaXRpb24tYWxsIGRpc2FibGVkOm9wYWNpdHktNTAgZGlzYWJsZWQ6c2NhbGUtMTAwXFxcIj5cXG4gICAgICAgICAgICAgICAgICB7aXNTZW5kaW5nID8gPGRpdiBjbGFzc05hbWU9XFxcInctNSBoLTUgYm9yZGVyLTIgYm9yZGVyLXdoaXRlLzMwIGJvcmRlci10LXdoaXRlIHJvdW5kZWQtZnVsbCBhbmltYXRlLXNwaW5cXFwiPjwvZGl2PiA6IDxTZW5kIHNpemU9ezE4fSBjbGFzc05hbWU9XFxcInRleHQtd2hpdGVcXFwiLz59XFxuICAgICAgICAgICAgICAgPC9idXR0b24+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICl9XFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJzcGFjZS15LTYgc206c3BhY2UteS0xMFxcXCI+XFxuICAgICAgICAgICAgIHtjb21tZW50cy5sZW5ndGggPT09IDAgPyAoXFxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cXFwidGV4dC1jZW50ZXIgdGV4dC1ncmF5LTYwMCBmb250LWJsYWNrIHVwcGVyY2FzZSB0ZXh0LVsxMHB4XVxcXCI+2YPZhiDYo9mI2YQg2YXZhiDZiti52YTZgiDZg9i52YXZhNin2YI8L3A+XFxuICAgICAgICAgICAgICkgOiBjb21tZW50cy5tYXAoYyA9PiAoXFxuICAgICAgICAgICAgICAgIDxkaXYga2V5PXtjLmlkfSBjbGFzc05hbWU9XFxcInNwYWNlLXktNCBncm91cCBhbmltYXRlLWZhZGUtaW4gYm9yZGVyLXIgYm9yZGVyLXdoaXRlLzUgcHItNFxcXCI+XFxuICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGp1c3RpZnktYmV0d2VlbiBpdGVtcy1zdGFydFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGdhcC00IGl0ZW1zLWNlbnRlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgIDxpbWcgc3JjPXtjLnVzZXJQaG90b30gY2xhc3NOYW1lPVxcXCJ3LTEwIGgtMTAgc206dy0xNiBzbTpoLTE2IHJvdW5kZWQteGwgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBvYmplY3QtY292ZXJcXFwiIC8+XFxuICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXY+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxoNCBjbGFzc05hbWU9XFxcImZvbnQtYmxhY2sgdGV4dC13aGl0ZSB0ZXh0LXhzIHNtOnRleHQteGxcXFwiPntjLnVzZXJOYW1lfTwvaDQ+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cXFwidGV4dC1bN3B4XSBzbTp0ZXh0LVsxMHB4XSB0ZXh0LWdyYXktNjAwIGZvbnQtYmxhY2sgdXBwZXJjYXNlXFxcIj57bmV3IERhdGUoYy50aW1lc3RhbXApLnRvTG9jYWxlRGF0ZVN0cmluZygpfTwvcD5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgICB7KGlzQWRtaW4gfHwgYy51c2VySWQgPT09IHVzZXI/LmlkKSAmJiAoXFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggZ2FwLTJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHtpc0FkbWluICYmIDxidXR0b24gb25DbGljaz17KCkgPT4gcmVwbHlDb21tZW50KGMuaWQpfSBjbGFzc05hbWU9XFxcInAtMiB0ZXh0LWJsdWUtNTAwIGhvdmVyOmJnLWJsdWUtNTAwLzEwIHJvdW5kZWQtbGdcXFwiPjxSZXBseSBzaXplPXsxNn0vPjwvYnV0dG9uPn1cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IGRlbGV0ZUNvbW1lbnQoYy5pZCl9IGNsYXNzTmFtZT1cXFwicC0yIHRleHQtcmVkLTUwMCBob3ZlcjpiZy1yZWQtNTAwLzEwIHJvdW5kZWQtbGdcXFwiPjxUcmFzaDIgc2l6ZT17MTZ9Lz48L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgICAgKX1cXG4gICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cXFwidGV4dC1ncmF5LTMwMCB0ZXh0LXhzIHNtOnRleHQtbGcgbGVhZGluZy1yZWxheGVkXFxcIj57Yy50ZXh0fTwvcD5cXG4gICAgICAgICAgICAgICAgICAge2MucmVwbHlUZXh0ICYmIChcXG4gICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImJnLXJlZC02MDAvNSBib3JkZXItci00IGJvcmRlci1yZWQtNjAwIHAtNCBzbTpwLTggcm91bmRlZC0yeGwgbXItNCBzbTptci0xMiBzcGFjZS15LTJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XFxcInRleHQtWzhweF0gc206dGV4dC14cyBmb250LWJsYWNrIHRleHQtcmVkLTYwMCB1cHBlcmNhc2UgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcXFwiPjxTaGllbGRDaGVjayBzaXplPXsxMn0vPiB7dC5hZG1pblJhbmt9PC9wPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XFxcInRleHQtd2hpdGUgdGV4dC14cyBzbTp0ZXh0LWxnIGl0YWxpY1xcXCI+XFxcIntjLnJlcGx5VGV4dH1cXFwiPC9wPlxcbiAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgKX1cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICkpfVxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgKTtcXG59O1xcblxcbmNvbnN0IFNlbGVjdGVkTWVkaWEgPSAoKSA9PiB7XFxuICBjb25zdCB7IHQsIHNlbGVjdGVkTWVkaWEsIHNldFNlbGVjdGVkTWVkaWEsIHVzZXIsIGlzQWRtaW4sIHNldFZpZXcgfSA9IHVzZUNvbnRleHQoQXBwQ29udGV4dCk7XFxuICBpZiAoIXNlbGVjdGVkTWVkaWEpIHJldHVybiBudWxsO1xcblxcbiAgcmV0dXJuIChcXG4gICAgPGRpdiBjbGFzc05hbWU9XFxcImZpeGVkIGluc2V0LTAgei1bMTAwMF0gYmctYmxhY2svOTUgYmFja2Ryb3AtYmx1ci0zeGwgb3ZlcmZsb3cteS1hdXRvIGFuaW1hdGUtZmFkZS1pbiBzY3JvbGxiYXItaGlkZVxcXCI+XFxuICAgICAgPGRpdiBjbGFzc05hbWU9XFxcIm1heC13LTd4bCBteC1hdXRvIG1pbi1oLXNjcmVlbiBwLTMgc206cC0yMCByZWxhdGl2ZVxcXCI+XFxuICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHNldFNlbGVjdGVkTWVkaWEobnVsbCl9IGNsYXNzTmFtZT1cXFwiZml4ZWQgdG9wLTQgbGVmdC00IHNtOnRvcC0xNiBzbTpsZWZ0LTE2IGJnLWJsYWNrLzYwIHAtMi41IHNtOnAtNiByb3VuZGVkLWZ1bGwgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCB0ZXh0LXdoaXRlIHotWzEwMTBdIGhvdmVyOmJnLXJlZC02MDAgdHJhbnNpdGlvbi1hbGwgc2hhZG93LTJ4bCBhY3RpdmU6c2NhbGUtOTBcXFwiPjxYIHNpemU9ezIwfS8+PC9idXR0b24+XFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwic3BhY2UteS04IHNtOnNwYWNlLXktMTZcXFwiPlxcbiAgICAgICAgICAge3NlbGVjdGVkTWVkaWEuY2F0ZWdvcnkgPT09ICdzdXBlcicgJiYgIXVzZXI/LmlzU3Vic2NyaWJlZCAmJiAhaXNBZG1pbiA/IChcXG4gICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInctZnVsbCBoLVs2MHZoXSBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBiZy1ibGFjay82MCBiYWNrZHJvcC1ibHVyLTN4bCByb3VuZGVkLVs0cmVtXSBib3JkZXItMiBib3JkZXItZGFzaGVkIGJvcmRlci1yZWQtNjAwLzMwIHNwYWNlLXktNiBwLTEwIHRleHQtY2VudGVyXFxcIj5cXG4gICAgICAgICAgICAgICAgPExvY2sgc2l6ZT17ODB9IGNsYXNzTmFtZT1cXFwidGV4dC1yZWQtNjAwIGFuaW1hdGUtYm91bmNlXFxcIiAvPlxcbiAgICAgICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVxcXCJ0ZXh0LTN4bCBzbTp0ZXh0LTV4bCBmb250LWJsYWNrIHRleHQtd2hpdGUgdXBwZXJjYXNlXFxcIj57dC5sb2dpblByb21wdH08L2gyPlxcbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XFxcInRleHQtZ3JheS00MDAgbWF4LXctbWRcXFwiPnt0LnN1YnNjcmliZVByb21wdH08L3A+XFxuICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4geyBzZXRTZWxlY3RlZE1lZGlhKG51bGwpOyBzZXRWaWV3KCdzdXBlci1naWFudCcpOyB9fSBjbGFzc05hbWU9XFxcImJnLXJlZC02MDAgcHgtMTAgcHktNCByb3VuZGVkLTJ4bCBmb250LWJsYWNrIHRleHQtd2hpdGUgdXBwZXJjYXNlIHNoYWRvdy0yeGwgc2hhZG93LXJlZC02MDAvNDAgaG92ZXI6c2NhbGUtMTA1IHRyYW5zaXRpb24tYWxsXFxcIj5cXG4gICAgICAgICAgICAgICAgICAge3Quc3Vic2NyaWJlTm93fVxcbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cXG4gICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICApIDogKFxcbiAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwidy1mdWxsIGgtWzQ1dmhdIHNtOmgtWzgwdmhdIHJvdW5kZWQtMnhsIHNtOnJvdW5kZWQtWzRyZW1dIG92ZXJmbG93LWhpZGRlbiBib3JkZXItMiBib3JkZXItcmVkLTYwMC8zMCBzaGFkb3ctWzBfMF81MHB4X3JnYmEoMjM5LDY4LDY4LDAuMildIGJnLWJsYWNrIHJlbGF0aXZlIGdyb3VwIG10LTEwIHNtOm10LTBcXFwiPlxcbiAgICAgICAgICAgICAgICB7IChzZWxlY3RlZE1lZGlhLnZpZGVvVXJsIHx8IHNlbGVjdGVkTWVkaWEuYm9va1VybCk/LnN0YXJ0c1dpdGgoJ2RhdGE6dmlkZW8nKSB8fCAoc2VsZWN0ZWRNZWRpYS52aWRlb1VybCB8fCBzZWxlY3RlZE1lZGlhLmJvb2tVcmwpPy5tYXRjaCgvXFxcXC4obXA0fHdlYm18b2dnKSQvaSkgPyAoXFxuICAgICAgICAgICAgICAgICAgICA8dmlkZW8gc3JjPXtzZWxlY3RlZE1lZGlhLnZpZGVvVXJsIHx8IHNlbGVjdGVkTWVkaWEuYm9va1VybH0gY29udHJvbHMgY2xhc3NOYW1lPVxcXCJ3LWZ1bGwgaC1mdWxsIG9iamVjdC1jb250YWluXFxcIiAvPlxcbiAgICAgICAgICAgICAgICApIDogKFxcbiAgICAgICAgICAgICAgICAgICAgPGlmcmFtZSBzcmM9e2Zvcm1hdEVtYmVkVXJsKHNlbGVjdGVkTWVkaWEudmlkZW9VcmwgfHwgc2VsZWN0ZWRNZWRpYS5ib29rVXJsKX0gY2xhc3NOYW1lPVxcXCJ3LWZ1bGwgaC1mdWxsIGJvcmRlci1ub25lXFxcIiBhbGxvd0Z1bGxTY3JlZW4gbG9hZGluZz1cXFwibGF6eVxcXCIgdGl0bGU9e3NlbGVjdGVkTWVkaWEudGl0bGV9IGFsbG93PVxcXCJhY2NlbGVyb21ldGVyOyBhdXRvcGxheTsgY2xpcGJvYXJkLXdyaXRlOyBlbmNyeXB0ZWQtbWVkaWE7IGd5cm9zY29wZTsgcGljdHVyZS1pbi1waWN0dXJlOyB3ZWItc2hhcmU7IGZ1bGxzY3JlZW5cXFwiPjwvaWZyYW1lPlxcbiAgICAgICAgICAgICAgICApfVxcbiAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICl9XFxuICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiYmctd2hpdGUvWzAuMDJdIGJhY2tkcm9wLWJsdXItM3hsIHAtNSBzbTpwLTE2IHJvdW5kZWQtWzEuNXJlbV0gc206cm91bmRlZC1bNXJlbV0gYm9yZGVyIGJvcmRlci13aGl0ZS81IHNwYWNlLXktNiBzbTpzcGFjZS15LTEwIHNoYWRvdy0yeGxcXFwiPlxcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggZmxleC1jb2wgbGc6ZmxleC1yb3cganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLXN0YXJ0IGdhcC00IHNtOmdhcC04XFxcIj5cXG4gICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJzcGFjZS15LTIgc206c3BhY2UteS0zIGZsZXgtMSB0ZXh0LXJpZ2h0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGZsZXgtd3JhcCBpdGVtcy1jZW50ZXIgZ2FwLTIgc206Z2FwLTNcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cXFwidGV4dC14bCBzbTp0ZXh0LTd4bCBmb250LWJsYWNrIHRleHQtd2hpdGUgbG9nby10ZXh0LWdsb3cgbGVhZGluZy10aWdodCBicmVhay13b3Jkc1xcXCI+e3NlbGVjdGVkTWVkaWEudGl0bGV9PC9oMj5cXG4gICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cXFwiYmctcmVkLTYwMC8xMCBib3JkZXIgYm9yZGVyLXJlZC02MDAgdGV4dC1yZWQtNjAwIHB4LTIgcHktMC41IHJvdW5kZWQtZnVsbCB0ZXh0LVs3cHhdIHNtOnRleHQteHMgZm9udC1ibGFjayB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMWVtXSBzaGFkb3ctbGcgc2hyaW5rLTBcXFwiPntzZWxlY3RlZE1lZGlhLmNhdGVnb3J5ID09PSAnc3VwZXInID8gdC5lbGl0ZSA6IHQuZnJlZX08L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4IGZsZXgtd3JhcCBpdGVtcy1jZW50ZXIgZ2FwLTMgbXQtNFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICB7c2VsZWN0ZWRNZWRpYS5hbGxvd0Rvd25sb2FkICYmIChcXG4gICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiB3aW5kb3cub3BlbihzZWxlY3RlZE1lZGlhLnZpZGVvVXJsIHx8IHNlbGVjdGVkTWVkaWEuYm9va1VybCwgJ19ibGFuaycpfSBjbGFzc05hbWU9XFxcImJnLXdoaXRlLzUgaG92ZXI6Ymctd2hpdGUvMTAgdGV4dC13aGl0ZSBweC02IHB5LTMgcm91bmRlZC0yeGwgZm9udC1ibGFjayB1cHBlcmNhc2UgdGV4dC1bMTBweF0gYm9yZGVyIGJvcmRlci13aGl0ZS8xMCB0cmFuc2l0aW9uLWFsbCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMlxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgPERvd25sb2FkIHNpemU9ezE2fSAvPiB7dC5kb3dubG9hZH1cXG4gICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XFxuICAgICAgICAgICAgICAgICAgICAgICApfVxcbiAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiB7XFxuICAgICAgICAgICAgICAgICAgICAgICAgIG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KHdpbmRvdy5sb2NhdGlvbi5ocmVmKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgYWxlcnQodC5rZXlDb3BpZWQpO1xcbiAgICAgICAgICAgICAgICAgICAgICAgfX0gY2xhc3NOYW1lPVxcXCJiZy1yZWQtNjAwIHRleHQtd2hpdGUgcHgtNiBweS0zIHJvdW5kZWQtMnhsIGZvbnQtYmxhY2sgdXBwZXJjYXNlIHRleHQtWzEwcHhdIHNoYWRvdy1sZyBzaGFkb3ctcmVkLTYwMC8yMCBob3ZlcjpzY2FsZS0xMDUgdHJhbnNpdGlvbi1hbGwgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICA8U2hhcmUyIHNpemU9ezE2fSAvPiB7dC5zaGFyZX1cXG4gICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICAgICAgICAge3NlbGVjdGVkTWVkaWEuc291cmNlVXJsICYmIChcXG4gICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiB3aW5kb3cub3BlbihzZWxlY3RlZE1lZGlhLnNvdXJjZVVybCwgJ19ibGFuaycpfSBjbGFzc05hbWU9XFxcImJnLXdoaXRlLzUgdGV4dC13aGl0ZSBweC02IHB5LTMgcm91bmRlZC0yeGwgZm9udC1ibGFjayB1cHBlcmNhc2UgdGV4dC1bMTBweF0gYm9yZGVyIGJvcmRlci13aGl0ZS8xMCB0cmFuc2l0aW9uLWFsbCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBnYXAtMlxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxFeHRlcm5hbExpbmsgc2l6ZT17MTZ9Lz4ge3Qudmlld0Zyb21Tb3VyY2V9XFxuICAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICAgICAgICAgKX1cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJzcGFjZS15LTQgc206c3BhY2UteS02IHRleHQtcmlnaHRcXFwiPlxcbiAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVxcXCJ0ZXh0LWdyYXktMzAwIGxlYWRpbmctcmVsYXhlZCB0ZXh0LVsxMXB4XSBzbTp0ZXh0LTJ4bCBmb250LW1lZGl1bSBtYXgtdy02eGwgYnJlYWstd29yZHMgdGV4dC1qdXN0aWZ5XFxcIj57c2VsZWN0ZWRNZWRpYS5kZXNjcmlwdGlvbn08L3A+XFxuICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgPENvbW1lbnRzU2VjdGlvbiBtZWRpYUlkPXtzZWxlY3RlZE1lZGlhLmlkfSBtZWRpYVRpdGxlPXtzZWxlY3RlZE1lZGlhLnRpdGxlfSAvPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgKTtcXG59O1xcblxcbmNvbnN0IEFwcENvbnRlbnQgPSAoKSA9PiB7XFxuICBjb25zdCBjb250ZXh0ID0gdXNlQ29udGV4dChBcHBDb250ZXh0KTtcXG4gIGNvbnN0IHsgdCwgY3VycmVudFZpZXcsIGxvYWRpbmcsIHNlbGVjdGVkTWVkaWEsIHNldFNlbGVjdGVkTWVkaWEsIHVzZXIsIGlzQWRtaW4sIHNldFZpZXcsIHZpZGVvcywgYm9va3MsIHBsYW5zLCBub3RpZmljYXRpb25zLCBpc0xvZ2dlZCwgc2V0U2hvd0xvZ2luLCBzaG93TG9naW4sIGxhbmd1YWdlLCBzZXRMYW5ndWFnZSwgcG9zdHMsIGlzTWVudU9wZW4sIHNldElzTWVudU9wZW4sIHJlbWFpbmluZ01zLCBjb29raWVBY2NlcHRlZCwgc2V0Q29va2llQWNjZXB0ZWQsIHNlYXNvbnMgfSA9IGNvbnRleHQ7XFxuICBjb25zdCBbc2VsZWN0ZWRQb3N0LCBzZXRTZWxlY3RlZFBvc3RdID0gdXNlU3RhdGU8UG9zdCB8IG51bGw+KG51bGwpO1xcblxcbiAgaWYgKGxvYWRpbmcpIHJldHVybiAoXFxuICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJoLXNjcmVlbiBmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBiZy1ibGFja1xcXCI+XFxuICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJyZWxhdGl2ZVxcXCI+XFxuICAgICAgICAgIDxpbWcgc3JjPXtMT0dPX1VSTH0gcmVmZXJyZXJQb2xpY3k9XFxcIm5vLXJlZmVycmVyXFxcIiBjbGFzc05hbWU9XFxcInctMjQgaC0yNCBzbTp3LTMyIHNtOmgtMzIgcm91bmRlZC1mdWxsIGJvcmRlci00IGJvcmRlci1yZWQtNjAwIGFuaW1hdGUtcHVsc2UgZmlyZS1nbG93XFxcIiAvPlxcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiYWJzb2x1dGUgaW5zZXQtMCBib3JkZXItOCBib3JkZXItdHJhbnNwYXJlbnQgYm9yZGVyLXQtcmVkLTYwMCByb3VuZGVkLWZ1bGwgYW5pbWF0ZS1zcGluXFxcIj48L2Rpdj5cXG4gICAgICAgPC9kaXY+XFxuICAgICAgIDxoMSBjbGFzc05hbWU9XFxcIm10LTggdGV4dC0yeGwgc206dGV4dC00eGwgZm9udC1ibGFjayB0ZXh0LXJlZC02MDAgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVzdCBsb2dvLXRleHQtZ2xvdyBhbmltYXRlLWJvdW5jZVxcXCI+QW5pbWU0R2lhbnQ8L2gxPlxcbiAgICA8L2Rpdj5cXG4gICk7XFxuXFxuICByZXR1cm4gKFxcbiAgICA8ZGl2IGNsYXNzTmFtZT1cXFwibWluLWgtc2NyZWVuIHNlbGVjdGlvbjpiZy1yZWQtNjAwIG5vLXNlbGVjdCBwYi0zMiBvdmVyZmxvdy14LWhpZGRlbiBiZy1bIzA1MDUwNV1cXFwiIGRpcj17dC5kaXJ9PlxcbiAgICAgIDxoZWFkZXIgY2xhc3NOYW1lPVxcXCJmaXhlZCB0b3AtMCBsZWZ0LTAgcmlnaHQtMCB6LVs0MDBdIHB4LTMgc206cHgtMTIgcHktMyBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gYmctYmxhY2svNzAgYmFja2Ryb3AtYmx1ci0zeGwgYm9yZGVyLWIgYm9yZGVyLXdoaXRlLzVcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHNtOmdhcC0zXFxcIj5cXG4gICAgICAgICAgIDxpbWcgc3JjPXt1c2VyPy5waG90b1VybCB8fCBMT0dPX1VSTH0gY2xhc3NOYW1lPVxcXCJ3LTggaC04IHNtOnctMTAgc206aC0xMCByb3VuZGVkLWxnIGJvcmRlciBib3JkZXItd2hpdGUvMTAgY3Vyc29yLXBvaW50ZXJcXFwiIG9uQ2xpY2s9eygpID0+IHNldElzTWVudU9wZW4odHJ1ZSl9IC8+XFxuICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHNldFZpZXcoJ3Byb2ZpbGUnKX0gY2xhc3NOYW1lPXtgdy04IGgtOCBzbTp3LTEwIHNtOmgtMTAgcm91bmRlZC1sZyBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciAke2N1cnJlbnRWaWV3ID09PSAncHJvZmlsZScgPyAndGV4dC1yZWQtNjAwIGJnLXJlZC02MDAvMTAnIDogJ2JnLXdoaXRlLzUgdGV4dC1ncmF5LTQwMCd9YH0+XFxuICAgICAgICAgICAgICA8VXNlckNpcmNsZSBzaXplPXsyMH0gLz5cXG4gICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBzZXRMYW5ndWFnZShsYW5ndWFnZSA9PT0gJ2FyJyA/ICdlbicgOiAnYXInKX0gY2xhc3NOYW1lPVxcXCJiZy13aGl0ZS81IHctOCBoLTggc206dy0xMCBzbTpoLTEwIHJvdW5kZWQtbGcgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgdGV4dC1bOHB4XSBmb250LWJsYWNrIHRleHQtZ3JheS00MDBcXFwiPkFSL0VOPC9idXR0b24+XFxuICAgICAgICAgICB7aXNBZG1pbiAmJiA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHNldFZpZXcoJ2FkbWluJyl9IGNsYXNzTmFtZT17YHctOCBoLTggc206dy0xMCBzbTpoLTEwIHJvdW5kZWQtbGcgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgJHtjdXJyZW50VmlldyA9PT0gJ2FkbWluJyA/ICdiZy1yZWQtNjAwIHRleHQtd2hpdGUnIDogJ2JnLXdoaXRlLzUgdGV4dC1ncmF5LTQwMCd9YH0+PFNldHRpbmdzIHNpemU9ezE2fS8+PC9idXR0b24+fVxcbiAgICAgICAgICAgeyFpc0xvZ2dlZCAmJiAoXFxuICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gc2V0U2hvd0xvZ2luKHRydWUpfSBjbGFzc05hbWU9XFxcImJnLXJlZC02MDAgcHgtMyBweS0xLjUgcm91bmRlZC1sZyBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMSBmb250LWJsYWNrIHRleHQtWzhweF0gc206dGV4dC14cyB1cHBlcmNhc2UgaG92ZXI6c2NhbGUtMTA1IGFjdGl2ZTpzY2FsZS05NSB0cmFuc2l0aW9uLWFsbCBzaGFkb3cteGwgc2hhZG93LXJlZC02MDAvMzAgdGV4dC13aGl0ZVxcXCI+XFxuICAgICAgICAgICAgICAgIDxVc2VyUGx1cyBzaXplPXsxMn0vPiA8c3BhbiBjbGFzc05hbWU9XFxcImhpZGRlbiB4czppbmxpbmVcXFwiPnt0LmpvaW5Vc308L3NwYW4+XFxuICAgICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgICAgKX1cXG4gICAgICAgICAgIDxidXR0b24gb25DbGljaz17KCkgPT4gc2V0Vmlldygnbm90aWZpY2F0aW9ucycpfSBjbGFzc05hbWU9e2BiZy13aGl0ZS81IHctOCBoLTggc206dy0xMCBzbTpoLTEwIHJvdW5kZWQtbGcgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgJHtjdXJyZW50VmlldyA9PT0gJ25vdGlmaWNhdGlvbnMnID8gJ3RleHQtcmVkLTYwMCcgOiAndGV4dC1ncmF5LTQwMCd9YH0+XFxuICAgICAgICAgICAgICA8QmVsbCBzaXplPXsxNn0gLz5cXG4gICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBzZXRWaWV3KCdzZWFyY2gnKX0gY2xhc3NOYW1lPXtgYmctd2hpdGUvNSB3LTggaC04IHNtOnctMTAgc206aC0xMCByb3VuZGVkLWxnIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyICR7Y3VycmVudFZpZXcgPT09ICdzZWFyY2gnID8gJ3RleHQtcmVkLTYwMCcgOiAndGV4dC1ncmF5LTQwMCd9YH0+XFxuICAgICAgICAgICAgICA8U2VhcmNoIHNpemU9ezE2fSAvPlxcbiAgICAgICAgICAgPC9idXR0b24+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmbGV4LTEgZmxleCBqdXN0aWZ5LWNlbnRlciBweC0xXFxcIj5cXG4gICAgICAgICAgIDxoMSBjbGFzc05hbWU9XFxcInRleHQtc20gc206dGV4dC00eGwgZm9udC1ibGFjayBsb2dvLXRleHQtZ2xvdyB1cHBlcmNhc2UgdHJhY2tpbmctdGlnaHRlciB0ZXh0LXdoaXRlIHRydW5jYXRlIG1heC13LVsxMDBweF0gc206bWF4LXctbm9uZVxcXCI+e3Quc2l0ZU5hbWV9PC9oMT5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggaXRlbXMtY2VudGVyXFxcIj5cXG4gICAgICAgICAgIDxpbWcgc3JjPXtMT0dPX1VSTH0gcmVmZXJyZXJQb2xpY3k9XFxcIm5vLXJlZmVycmVyXFxcIiBjbGFzc05hbWU9XFxcInctOCBoLTggc206dy0xMiBzbTpoLTEyIHJvdW5kZWQtbGcgYm9yZGVyLTIgYm9yZGVyLXJlZC02MDAgc2hhZG93LTJ4bCBmaXJlLWdsb3dcXFwiIC8+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICA8L2hlYWRlcj5cXG5cXG4gICAgICA8U2lkZU1lbnUgLz5cXG5cXG4gICAgICA8bWFpbiBjbGFzc05hbWU9XFxcInB0LTIwIHNtOnB0LTI0IHB4LTMgc206cHgtOCBtYXgtdy1zY3JlZW4tMnhsIG14LWF1dG8gc3BhY2UteS0xMCBzbTpzcGFjZS15LTE2IHBiLTMyXFxcIj5cXG4gICAgICAgIDxBbmltYXRlUHJlc2VuY2UgbW9kZT1cXFwid2FpdFxcXCI+XFxuICAgICAgICAgIDxtb3Rpb24uZGl2XFxuICAgICAgICAgICAga2V5PXtjdXJyZW50VmlldyArIChzZWxlY3RlZE1lZGlhPy5pZCB8fCAnJykgKyAoc2VsZWN0ZWRQb3N0Py5pZCB8fCAnJyl9XFxuICAgICAgICAgICAgaW5pdGlhbD17eyBvcGFjaXR5OiAwLCB5OiAxMCB9fVxcbiAgICAgICAgICAgIGFuaW1hdGU9e3sgb3BhY2l0eTogMSwgeTogMCB9fVxcbiAgICAgICAgICAgIGV4aXQ9e3sgb3BhY2l0eTogMCwgeTogLTEwIH19XFxuICAgICAgICAgICAgdHJhbnNpdGlvbj17eyBkdXJhdGlvbjogMC4zIH19XFxuICAgICAgICAgID5cXG4gICAgICAgICAgICB7Y3VycmVudFZpZXcgPT09ICdob21lJyAmJiAoXFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwic3BhY2UteS0xMFxcXCI+XFxuICAgICAgICAgICAgICAgIHtzZWxlY3RlZE1lZGlhID8gKFxcbiAgICAgICAgICAgICAgICAgIDxTZWxlY3RlZE1lZGlhIC8+XFxuICAgICAgICAgICAgICAgICkgOiAoXFxuICAgICAgICAgICAgICAgICAgPD5cXG4gICAgICAgICAgICAgICAgICAgIHtwb3N0cy5sZW5ndGggPiAwICYmIChcXG4gICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInJlbGF0aXZlIGgtNTYgc206aC1bMzJyZW1dIHJvdW5kZWQtMnhsIHNtOnJvdW5kZWQtWzRyZW1dIG92ZXJmbG93LWhpZGRlbiBzaGFkb3ctMnhsIGJvcmRlciBib3JkZXItd2hpdGUvNSBjdXJzb3ItcG9pbnRlciBhY3RpdmU6c2NhbGUtWzAuOThdIHRyYW5zaXRpb24tYWxsXFxcIiBvbkNsaWNrPXsoKSA9PiB7IHNldFNlbGVjdGVkUG9zdChwb3N0c1swXSk7IHNldFZpZXcoJ3Bvc3QtdmlldycpOyB9fT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8aW1nIHNyYz17cG9zdHNbMF0uaW1hZ2VzWzBdIHx8IExPR09fVVJMfSBjbGFzc05hbWU9XFxcInctZnVsbCBoLWZ1bGwgb2JqZWN0LWNvdmVyXFxcIiAvPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJhYnNvbHV0ZSBpbnNldC0wIGJnLWdyYWRpZW50LXRvLXQgZnJvbS1ibGFjayB2aWEtYmxhY2svMjAgdG8tdHJhbnNwYXJlbnQgZmxleCBmbGV4LWNvbCBqdXN0aWZ5LWVuZCBwLTQgc206cC0xMlxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cXFwiYmctcmVkLTYwMCB3LWZpdCBweC0yIHB5LTAuNSByb3VuZGVkLWZ1bGwgdGV4dC1bN3B4XSBzbTp0ZXh0LVsxMHB4XSBmb250LWJsYWNrIHVwcGVyY2FzZSBtYi0xIHNtOm1iLTQgdHJhY2tpbmctd2lkZXN0IHRleHQtd2hpdGUgc2hhZG93LWxnXFxcIj7Yo9it2K/YqyDYrdi12LHZitin2Kog2KfZhNi52YXYp9mE2YLYqTwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cXFwidGV4dC1iYXNlIHNtOnRleHQtNnhsIGZvbnQtYmxhY2sgdGV4dC13aGl0ZSBsb2dvLXRleHQtZ2xvdyBsZWFkaW5nLXRpZ2h0IGxpbmUtY2xhbXAtMlxcXCI+e3Bvc3RzWzBdLnRpdGxlfTwvaDI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgKX1cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJzcGFjZS15LTEyIHNtOnNwYWNlLXktMjRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICA8TWVkaWFSb3cgbGlzdD17c2Vhc29uc30gdGl0bGU9e3Quc2Vhc29uc30gc2V0U2VsZWN0ZWRNZWRpYT17c2V0U2VsZWN0ZWRNZWRpYX0gdD17dH0gdHlwZT1cXFwic2Vhc29uXFxcIiAvPlxcbiAgICAgICAgICAgICAgICAgICAgICA8TWVkaWFSb3cgbGlzdD17dmlkZW9zLmZpbHRlcih2ID0+IHYuY2F0ZWdvcnkgPT09ICdzdXBlcicgJiYgIXNlYXNvbnMuc29tZShzID0+IHMudmlkZW9JZHMuaW5jbHVkZXModi5pZCkpKX0gdGl0bGU9e3Quc3VwZXJHaWFudH0gc2V0U2VsZWN0ZWRNZWRpYT17c2V0U2VsZWN0ZWRNZWRpYX0gdD17dH0gLz5cXG4gICAgICAgICAgICAgICAgICAgICAgPE1lZGlhUm93IGxpc3Q9e3ZpZGVvcy5maWx0ZXIodiA9PiB2LmNhdGVnb3J5ID09PSAnb3BlbicgJiYgIXNlYXNvbnMuc29tZShzID0+IHMudmlkZW9JZHMuaW5jbHVkZXModi5pZCkpKX0gdGl0bGU9e3QuZnJlZVZpZGVvc30gc2V0U2VsZWN0ZWRNZWRpYT17c2V0U2VsZWN0ZWRNZWRpYX0gdD17dH0gLz5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgIDwvPlxcbiAgICAgICAgICAgICAgICApfVxcbiAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgKX1cXG5cXG4gICAgICAgICAgICB7Y3VycmVudFZpZXcgPT09ICdwb3N0LXZpZXcnICYmIHNlbGVjdGVkUG9zdCAmJiAoXFxuICAgICAgICAgICAgICAgPFBvc3RWaWV3IHBvc3Q9e3NlbGVjdGVkUG9zdH0gb25CYWNrPXsoKSA9PiBzZXRWaWV3KCdob21lJyl9IHQ9e3R9IC8+XFxuICAgICAgICAgICAgKX1cXG5cXG4gICAgICAgICAgICB7Y3VycmVudFZpZXcgPT09ICdwb3N0cy1saXN0JyAmJiAoXFxuICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcIm1heC13LTV4bCBteC1hdXRvIHNwYWNlLXktMTAgc206c3BhY2UteS0xNiBwYi0yMFxcXCI+XFxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIHNtOmdhcC02IHB4LTFcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJ3LTEuNSBzbTp3LTQgaC0xMCBzbTpoLTIwIGJnLXJlZC02MDAgcm91bmRlZC1mdWxsXFxcIj48L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVxcXCJ0ZXh0LXhsIHNtOnRleHQtN3hsIGZvbnQtYmxhY2sgdGV4dC13aGl0ZSB1cHBlcmNhc2UgdHJhY2tpbmctdGlnaHRlciBsb2dvLXRleHQtZ2xvdyBsZWFkaW5nLW5vbmVcXFwiPnt0LnBvc3RzVGl0bGV9PC9oMj5cXG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZ3JpZCBnYXAtNiBzbTpnYXAtMTZcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgIHtwb3N0cy5sZW5ndGggPT09IDAgPyAoXFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInB5LTIwIHRleHQtY2VudGVyIHRleHQtZ3JheS02MDAgZm9udC1ibGFjayB1cHBlcmNhc2UgdGV4dC14c1xcXCI+2YTYpyDYqtmI2KzYryDZhdmG2LTZiNix2KfYqiDZhNmE2LnZhdin2YTZgtipINio2LnYrzwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgICkgOiBwb3N0cy5tYXAocCA9PiAoXFxuICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGtleT17cC5pZH0gb25DbGljaz17KCkgPT4geyBzZXRTZWxlY3RlZFBvc3QocCk7IHNldFZpZXcoJ3Bvc3QtdmlldycpOyB9fSBjbGFzc05hbWU9XFxcImJnLWJsYWNrLzQwIGJvcmRlciBib3JkZXItd2hpdGUvNSByb3VuZGVkLTJ4bCBzbTpyb3VuZGVkLVs0cmVtXSBvdmVyZmxvdy1oaWRkZW4gc2hhZG93LTJ4bCBhY3RpdmU6c2NhbGUtWzAuOThdIHRyYW5zaXRpb24tYWxsXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHtwLmltYWdlcyAmJiBwLmltYWdlc1swXSAmJiA8aW1nIHNyYz17cC5pbWFnZXNbMF19IGNsYXNzTmFtZT1cXFwidy1mdWxsIGgtNDAgc206aC05NiBvYmplY3QtY292ZXJcXFwiIC8+fVxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcInAtNCBzbTpwLTEyIHNwYWNlLXktMiBzbTpzcGFjZS15LTZcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciB0ZXh0LVs3cHhdIHNtOnRleHQteHMgdGV4dC1ncmF5LTUwMCBmb250LWJsYWNrIHVwcGVyY2FzZVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Bhbj48Q2FsZW5kYXIgc2l6ZT17MTB9IGNsYXNzTmFtZT1cXFwiaW5saW5lIG1yLTEgdGV4dC1yZWQtNjAwXFxcIi8+IHtuZXcgRGF0ZShwLnRpbWVzdGFtcCkudG9Mb2NhbGVEYXRlU3RyaW5nKCl9PC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVxcXCJiZy1yZWQtNjAwLzEwIHRleHQtcmVkLTYwMCBweC0yIHB5LTAuNSByb3VuZGVkLWZ1bGxcXFwiPntwLmFkbWluTmFtZX08L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XFxcInRleHQtYmFzZSBzbTp0ZXh0LTR4bCBmb250LWJsYWNrIHRleHQtd2hpdGUgbGVhZGluZy10aWdodCBsaW5lLWNsYW1wLTJcXFwiPntwLnRpdGxlfTwvaDM+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XFxcInRleHQtZ3JheS00MDAgdGV4dC1bMTBweF0gc206dGV4dC14bCBsaW5lLWNsYW1wLTMgdGV4dC1qdXN0aWZ5XFxcIj57cC5jb250ZW50fTwvcD5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICAgKSl9XFxuICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgKX1cXG5cXG4gICAgICAgICAgICB7Y3VycmVudFZpZXcgPT09ICdub3ZlbHMnICYmIChcXG4gICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwic3BhY2UteS0xMiBzbTpzcGFjZS15LTI0XFxcIj5cXG4gICAgICAgICAgICAgICAgICB7c2VsZWN0ZWRNZWRpYSA/IChcXG4gICAgICAgICAgICAgICAgICAgIDxTZWxlY3RlZE1lZGlhIC8+XFxuICAgICAgICAgICAgICAgICAgKSA6IChcXG4gICAgICAgICAgICAgICAgICAgIDw+XFxuICAgICAgICAgICAgICAgICAgICAgIDxNZWRpYVJvdyBsaXN0PXtib29rcy5maWx0ZXIoYiA9PiBiLmNhdGVnb3J5ID09PSAnc3VwZXInKX0gdGl0bGU9e3Quc3VwZXJOb3ZlbHN9IHNldFNlbGVjdGVkTWVkaWE9e3NldFNlbGVjdGVkTWVkaWF9IHQ9e3R9IHR5cGU9XFxcImJvb2tcXFwiIC8+XFxuICAgICAgICAgICAgICAgICAgICAgIDxNZWRpYVJvdyBsaXN0PXtib29rcy5maWx0ZXIoYiA9PiBiLmNhdGVnb3J5ID09PSAnb3BlbicpfSB0aXRsZT17dC5mcmVlTm92ZWxzfSBzZXRTZWxlY3RlZE1lZGlhPXtzZXRTZWxlY3RlZE1lZGlhfSB0PXt0fSB0eXBlPVxcXCJib29rXFxcIiAvPlxcbiAgICAgICAgICAgICAgICAgICAgPC8+XFxuICAgICAgICAgICAgICAgICAgKX1cXG4gICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICApfVxcblxcbiAgICAgICAgICAgIHtjdXJyZW50VmlldyA9PT0gJ3NlYXJjaCcgJiYgPFNlYXJjaFZpZXcgLz59XFxuICAgICAgICAgICAge2N1cnJlbnRWaWV3ID09PSAnc2Vhc29uLXZpZXcnICYmIDxTZWFzb25WaWV3IC8+fVxcbiAgICAgICAgICAgIHtjdXJyZW50VmlldyA9PT0gJ2ZvcnVtJyAmJiA8Rm9ydW1WaWV3IC8+fVxcbiAgICAgICAgICAgIHtjdXJyZW50VmlldyA9PT0gJ3Byb2ZpbGUnICYmIDxZb3VyQWNjb3VudCAvPn1cXG4gICAgICAgICAgICB7Y3VycmVudFZpZXcgPT09ICdzdXBlci1naWFudCcgJiYgKFxcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcIm1heC13LTR4bCBteC1hdXRvIHNwYWNlLXktMTAgcGItMjAgcHgtMlxcXCI+XFxuICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwidGV4dC1jZW50ZXIgc3BhY2UteS00XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XFxcInRleHQtMnhsIHNtOnRleHQtNXhsIGZvbnQtYmxhY2sgdGV4dC13aGl0ZSBsb2dvLXRleHQtZ2xvd1xcXCI+e3QucHJlbWl1bX08L2gyPlxcbiAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVxcXCJ0ZXh0LWdyYXktNTAwIHRleHQtWzEwcHhdIHNtOnRleHQtc20gZm9udC1ibGFjayB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXN0XFxcIj57dC5zdWJzY3JpYmVQcm9tcHR9PC9wPlxcbiAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cXFwiZ3JpZCBnYXAtNFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICB7cGxhbnMubWFwKHAgPT4gKFxcbiAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGtleT17cC5pZH0gb25DbGljaz17KCkgPT4gc2V0U2hvd0xvZ2luKHRydWUpfSBjbGFzc05hbWU9XFxcImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLWNlbnRlciBwLTQgc206cC04IGJnLXdoaXRlLzUgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCByb3VuZGVkLTJ4bCBzbTpyb3VuZGVkLVszcmVtXSBob3Zlcjpib3JkZXItcmVkLTYwMC81MCB0cmFuc2l0aW9uLWFsbCB0ZXh0LXJpZ2h0IHNoYWRvdy0yeGxcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aDQgY2xhc3NOYW1lPVxcXCJmb250LWJsYWNrIHRleHQtYmFzZSBzbTp0ZXh0LTN4bCB0ZXh0LXdoaXRlXFxcIj57cC5uYW1lfTwvaDQ+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cXFwidGV4dC1bOHB4XSBzbTp0ZXh0LXhzIHRleHQtZ3JheS01MDAgZm9udC1ibGFjayB1cHBlcmNhc2UgbXQtMVxcXCI+e3AuZHVyYXRpb259IHt0W3AudW5pdF0gfHwgcC51bml0fTwvcD5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJ0ZXh0LWxlZnRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XFxcInRleHQteGwgc206dGV4dC00eGwgZm9udC1ibGFjayB0ZXh0LXJlZC02MDBcXFwiPntwLnByaWNlfSA8c3BhbiBjbGFzc05hbWU9XFxcInRleHQtWzEwcHhdIHVwcGVyY2FzZVxcXCI+e3QubGV9PC9zcGFuPjwvcD5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICAgICAgKSl9XFxuICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICl9XFxuICAgICAgICAgICAge2N1cnJlbnRWaWV3ID09PSAnYWRtaW4nICYmIDxBZG1pblBhbmVsIC8+fVxcbiAgICAgICAgICAgIHtjdXJyZW50VmlldyA9PT0gJ2Fib3V0LXVzJyAmJiA8RXh0ZW5zaXZlQ29udGVudCB0aXRsZT17dC5hYm91dFVzfSBjb250ZW50PXt0LmRpciA9PT0gJ3J0bCcgPyBcXFwi2YbYrdmGINmF2YbYtdipINi52YXZhNin2YI02KfZhNin2YbZitmF2YrYjCDZhtiz2LnZiSDZhNiq2YjZgdmK2LEg2KPZgdi22YQg2KrYrNix2KjYqSDZhNmF2LTYp9mH2K/YqSDYp9mE2KfZhtmK2YXZiiDZiNmC2LHYp9ih2Kkg2KfZhNix2YjYp9mK2KfYqiDYp9mE2K3Ytdix2YrYqS4g2YHYsdmK2YLZhtinINmK2LnZhdmEINio2KzYryDZhNiq2YjZgdmK2LEg2YXYrdiq2YjZiSDYudin2YTZiiDYp9mE2KzZiNiv2Kkg2YrZhNmK2YIg2KjYrNmF2YfZiNix2YbYpyDYp9mE2LnYsdio2YouXFxcIiA6IFxcXCJXZSBhcmUgQW5pbWU0R2lhbnQsIGRlZGljYXRlZCB0byBwcm92aWRpbmcgdGhlIGJlc3QgZXhwZXJpZW5jZSBmb3Igd2F0Y2hpbmcgYW5pbWUgYW5kIHJlYWRpbmcgZXhjbHVzaXZlIG5vdmVscy4gT3VyIHRlYW0gd29ya3MgaGFyZCB0byBwcm92aWRlIGhpZ2gtcXVhbGl0eSBjb250ZW50IGZvciBvdXIgYXVkaWVuY2UuXFxcIn0gLz59XFxuICAgICAgICAgICAge2N1cnJlbnRWaWV3ID09PSAnY29udGFjdC11cycgJiYgPEV4dGVuc2l2ZUNvbnRlbnQgdGl0bGU9e3QuY29udGFjdFVzfSBjb250ZW50PXt0LmRpciA9PT0gJ3J0bCcgPyBcXFwi2YrZhdmD2YbZg9mFINin2YTYqtmI2KfYtdmEINmF2LnZhtinINi52KjYsSDYp9mE2YjYp9iq2LPYp9ioINij2Ygg2KfZhNio2LHZitivINin2YTYpdmE2YPYqtix2YjZhtmKINmE2KPZiiDYp9iz2KrZgdiz2KfYsdin2Kog2KPZiCDYr9i52YUg2YHZhtmKLiDZhtit2YYg2YfZhtinINmE2K7Yr9mF2KrZg9mFINi52YTZiSDZhdiv2KfYsSDYp9mE2LPYp9i52KkuXFxcXG5cXFxcbtmI2KfYqtiz2KfYqDogKzIwMTIzNDU2Nzg5XFxcXG7Yp9mE2KjYsdmK2K8g2KfZhNil2YTZg9iq2LHZiNmG2Yo6IHN1cHBvcnRAYW5pbWU0Z2lhbnQuY29tXFxcIiA6IFxcXCJZb3UgY2FuIGNvbnRhY3QgdXMgdmlhIFdoYXRzQXBwIG9yIGVtYWlsIGZvciBhbnkgaW5xdWlyaWVzIG9yIHRlY2huaWNhbCBzdXBwb3J0LiBXZSBhcmUgaGVyZSB0byBzZXJ2ZSB5b3UgMjQvNy5cXFxcblxcXFxuV2hhdHNBcHA6ICsyMDEyMzQ1Njc4OVxcXFxuRW1haWw6IHN1cHBvcnRAYW5pbWU0Z2lhbnQuY29tXFxcIn0gLz59XFxuICAgICAgICAgICAge2N1cnJlbnRWaWV3ID09PSAndGVybXMtY29uZGl0aW9ucycgJiYgPEV4dGVuc2l2ZUNvbnRlbnQgdGl0bGU9e3QudGVybXN9IGNvbnRlbnQ9e3QuZGlyID09PSAncnRsJyA/IFxcXCLYqNin2LPYqtiu2K/Yp9mF2YMg2YTZhdmI2YLYudmG2KfYjCDZgdil2YbZgyDYqtmI2KfZgdmCINi52YTZiSDYtNix2YjYtyDYp9mE2KfYs9iq2K7Yr9in2YUg2KfZhNiu2KfYtdipINio2YbYpy4g2YrZhdmG2Lkg2KfYs9iq2K7Yr9in2YUg2KfZhNmF2K3YqtmI2Ykg2YTYo9i62LHYp9i2INiq2KzYp9ix2YrYqSDYr9mI2YYg2KXYsNmGINmF2LPYqNmCLiDZhtit2YYg2YbYrdiq2YHYuCDYqNin2YTYrdmCINmB2Yog2KrYudiv2YrZhCDZh9iw2Ycg2KfZhNi02LHZiNi3INmB2Yog2KPZiiDZiNmC2KouXFxcIiA6IFxcXCJCeSB1c2luZyBvdXIgc2l0ZSwgeW91IGFncmVlIHRvIG91ciB0ZXJtcyBvZiB1c2UuIEl0IGlzIHByb2hpYml0ZWQgdG8gdXNlIHRoZSBjb250ZW50IGZvciBjb21tZXJjaWFsIHB1cnBvc2VzIHdpdGhvdXQgcHJpb3IgcGVybWlzc2lvbi4gV2UgcmVzZXJ2ZSB0aGUgcmlnaHQgdG8gbW9kaWZ5IHRoZXNlIHRlcm1zIGF0IGFueSB0aW1lLlxcXCJ9IC8+fVxcbiAgICAgICAgICAgIHtjdXJyZW50VmlldyA9PT0gJ3ByaXZhY3ktcG9saWN5JyAmJiA8RXh0ZW5zaXZlQ29udGVudCB0aXRsZT17dC5wcml2YWN5UG9saWN5fSBjb250ZW50PXt0LmRpciA9PT0gJ3J0bCcgPyBcXFwi2YbYrdmGINmG2K3Yqtix2YUg2K7YtdmI2LXZitiq2YPZhSDZiNmG2YTYqtiy2YUg2KjYrdmF2KfZitipINio2YrYp9mG2KfYqtmD2YUg2KfZhNi02K7YtdmK2KkuINmG2LPYqtiu2K/ZhSDZhdmE2YHYp9iqINiq2LnYsdmK2YEg2KfZhNin2LHYqtio2KfYtyDZhNiq2K3Ys9mK2YYg2KrYrNix2KjYqSDYp9mE2YXYs9iq2K7Yr9mFINmB2YLYty4g2YTYpyDZhtmC2YjZhSDYqNmF2LTYp9ix2YPYqSDYqNmK2KfZhtin2KrZg9mFINmF2Lkg2KPZiiDYt9ix2YEg2KvYp9mE2KsuXFxcIiA6IFxcXCJXZSByZXNwZWN0IHlvdXIgcHJpdmFjeSBhbmQgYXJlIGNvbW1pdHRlZCB0byBwcm90ZWN0aW5nIHlvdXIgcGVyc29uYWwgZGF0YS4gV2UgdXNlIGNvb2tpZXMgdG8gaW1wcm92ZSB0aGUgdXNlciBleHBlcmllbmNlIG9ubHkuIFdlIGRvIG5vdCBzaGFyZSB5b3VyIGRhdGEgd2l0aCBhbnkgdGhpcmQgcGFydHkuXFxcIn0gLz59XFxuICAgICAgICAgICAge2N1cnJlbnRWaWV3ID09PSAnbm90aWZpY2F0aW9ucycgJiYgKFxcbiAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJtYXgtdy00eGwgbXgtYXV0byBzcGFjZS15LTggcGItMjAgcHgtMlxcXCI+XFxuICAgICAgICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cXFwidGV4dC14bCBmb250LWJsYWNrIGJvcmRlci1yLTggYm9yZGVyLXJlZC02MDAgcHItNCB1cHBlcmNhc2UgdGV4dC13aGl0ZVxcXCI+e3Qubm90aWZpY2F0aW9uc308L2gyPlxcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJncmlkIGdhcC00IHNtOmdhcC02XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIHtub3RpZmljYXRpb25zLm1hcChuID0+IChcXG4gICAgICAgICAgICAgICAgICAgICAgIDxkaXYga2V5PXtuLmlkfSBjbGFzc05hbWU9XFxcImdsYXNzLWVmZmVjdCBwLTQgc206cC04IHJvdW5kZWQtMnhsIHNtOnJvdW5kZWQtWzNyZW1dIGJvcmRlciBib3JkZXItd2hpdGUvNSBmbGV4IGdhcC00IHNtOmdhcC04IHNoYWRvdy0yeGwgaXRlbXMtc3RhcnRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XFxcImZsZXgtMSBzcGFjZS15LTEgc206c3BhY2UteS0zXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XFxcImZvbnQtYmxhY2sgdGV4dC1zbSBzbTp0ZXh0LXhsIHRleHQtd2hpdGVcXFwiPntuLnRpdGxlfTwvaDM+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XFxcInRleHQtZ3JheS00MDAgdGV4dC1bMTBweF0gc206dGV4dC1iYXNlIGxlYWRpbmctcmVsYXhlZFxcXCI+e24ubWVzc2FnZX08L3A+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XFxcInRleHQtWzdweF0gdGV4dC1ncmF5LTYwMCBmb250LWJsYWNrIHVwcGVyY2FzZVxcXCI+e25ldyBEYXRlKG4udGltZXN0YW1wKS50b0xvY2FsZURhdGVTdHJpbmcoKX08L3A+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHtpc0FkbWluICYmIDxidXR0b24gb25DbGljaz17KCkgPT4gZGVsZXRlRG9jKGRvYyhkYiwgJ25vdGlmaWNhdGlvbnMnLCBuLmlkKSl9IGNsYXNzTmFtZT1cXFwidGV4dC1yZWQtNTAwIHAtMVxcXCI+PFRyYXNoMiBzaXplPXsxNH0vPjwvYnV0dG9uPn1cXG4gICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgKSl9XFxuICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgKX1cXG4gICAgICAgICAgPC9tb3Rpb24uZGl2PlxcbiAgICAgICAgPC9BbmltYXRlUHJlc2VuY2U+XFxuICAgICAgPC9tYWluPlxcblxcbiAgICAgIDxuYXYgY2xhc3NOYW1lPVxcXCJmaXhlZCBib3R0b20tMCBsZWZ0LTAgcmlnaHQtMCB6LVs0MDBdIGJnLWJsYWNrLzcwIGJhY2tkcm9wLWJsdXItM3hsIGJvcmRlci10IGJvcmRlci13aGl0ZS81IHB4LTEgc206cHgtNiBwYi02IHB0LTMgZmxleCBqdXN0aWZ5LWFyb3VuZCBpdGVtcy1jZW50ZXIgc2hhZG93LVswXy0xMHB4XzMwcHhfcmdiYSgwLDAsMCwwLjUpXVxcXCI+XFxuICAgICAgICB7W1xcbiAgICAgICAgICB7IGlkOiAnaG9tZScsIGljb246IEhvbWUsIGxhYmVsOiB0LmhvbWUgfSxcXG4gICAgICAgICAgeyBpZDogJ3Bvc3RzLWxpc3QnLCBpY29uOiBOZXdzcGFwZXIsIGxhYmVsOiB0LnBvc3RzVGl0bGUgfSxcXG4gICAgICAgICAgeyBpZDogJ3N1cGVyLWdpYW50JywgaWNvbjogRmxhbWUsIGxhYmVsOiB0LnByZW1pdW0gfSxcXG4gICAgICAgICAgeyBpZDogJ3Byb2ZpbGUnLCBpY29uOiBVc2VyQ2lyY2xlLCBsYWJlbDogdC55b3VyQWNjb3VudCB9LFxcbiAgICAgICAgICB7IGlkOiAnbm92ZWxzJywgaWNvbjogQm9va09wZW4sIGxhYmVsOiB0Lm5vdmVscyB9LFxcbiAgICAgICAgICB7IGlkOiAnZm9ydW0nLCBpY29uOiBNZXNzYWdlU3F1YXJlLCBsYWJlbDogdC5mb3J1bSB9LFxcbiAgICAgICAgICB7IGlkOiAnbm90aWZpY2F0aW9ucycsIGljb246IEJlbGwsIGxhYmVsOiB0Lm5vdGlmaWNhdGlvbnMgfVxcbiAgICAgICAgXS5tYXAoaXRlbSA9PiAoXFxuICAgICAgICAgIDxidXR0b24ga2V5PXtpdGVtLmlkfSBvbkNsaWNrPXsoKSA9PiBzZXRWaWV3KGl0ZW0uaWQgYXMgYW55KX0gY2xhc3NOYW1lPXtgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIgZ2FwLTEgdHJhbnNpdGlvbi1hbGwgZHVyYXRpb24tMzAwIGFjdGl2ZTpzY2FsZS05MCAke2N1cnJlbnRWaWV3ID09PSBpdGVtLmlkIHx8IChpdGVtLmlkID09PSAnaG9tZScgJiYgY3VycmVudFZpZXcgPT09ICdwb3N0LXZpZXcnKSB8fCAoaXRlbS5pZCA9PT0gJ3Bvc3RzLWxpc3QnICYmIGN1cnJlbnRWaWV3ID09PSAncG9zdC12aWV3JykgPyAndGV4dC1yZWQtNjAwIHNjYWxlLTExMCcgOiAndGV4dC1ncmF5LTUwMCBob3Zlcjp0ZXh0LXdoaXRlJ31gfT5cXG4gICAgICAgICAgICA8aXRlbS5pY29uIHNpemU9e2N1cnJlbnRWaWV3ID09PSBpdGVtLmlkID8gMjIgOiAxNn0gZmlsbD17Y3VycmVudFZpZXcgPT09IGl0ZW0uaWQgfHwgKGl0ZW0uaWQgPT09ICdob21lJyAmJiBjdXJyZW50VmlldyA9PT0gJ3Bvc3QtdmlldycpIHx8IChpdGVtLmlkID09PSAncG9zdHMtbGlzdCcgJiYgY3VycmVudFZpZXcgPT09ICdwb3N0LXZpZXcnKSA/IFxcXCJjdXJyZW50Q29sb3JcXFwiIDogXFxcIm5vbmVcXFwifSAvPlxcbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT17YHRleHQtWzVweF0gc206dGV4dC1bOXB4XSBmb250LWJsYWNrIHVwcGVyY2FzZSB0cmFja2luZy13aWRlciB0cmFuc2l0aW9uLWFsbCAke2N1cnJlbnRWaWV3ID09PSBpdGVtLmlkID8gJ29wYWNpdHktMTAwJyA6ICdvcGFjaXR5LTYwJ31gfT57aXRlbS5sYWJlbH08L3NwYW4+XFxuICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgKSl9XFxuICAgICAgPC9uYXY+XFxuXFxuICAgICAge3Nob3dMb2dpbiAmJiA8Sm9pblBvcnRhbCBvbkNsb3NlPXsoKSA9PiBzZXRTaG93TG9naW4oZmFsc2UpfSAvPn1cXG5cXG4gICAgICB7IWNvb2tpZUFjY2VwdGVkICYmIChcXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVxcXCJmaXhlZCBib3R0b20tMjQgbGVmdC00IHJpZ2h0LTQgei1bNTAwXSBiZy1ibGFjay85MCBiYWNrZHJvcC1ibHVyLTN4bCBib3JkZXIgYm9yZGVyLXdoaXRlLzEwIHAtNCByb3VuZGVkLTJ4bCBmbGV4IGZsZXgtY29sIHNtOmZsZXgtcm93IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZ2FwLTQgYW5pbWF0ZS1mYWRlLWluXFxcIj5cXG4gICAgICAgICAgIDxwIGNsYXNzTmFtZT1cXFwidGV4dC1bMTBweF0gc206dGV4dC14cyB0ZXh0LWdyYXktNDAwIHRleHQtY2VudGVyIHNtOnRleHQtcmlnaHRcXFwiPnt0LmNvb2tpZUNvbnNlbnR9PC9wPlxcbiAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXsoKSA9PiB7IHNldENvb2tpZUFjY2VwdGVkKHRydWUpOyBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnY29va2llX2FjY2VwdGVkJywgJ3RydWUnKTsgfX0gY2xhc3NOYW1lPVxcXCJiZy1yZWQtNjAwIHB4LTYgcHktMiByb3VuZGVkLXhsIGZvbnQtYmxhY2sgdGV4dC13aGl0ZSB0ZXh0LVsxMHB4XSB1cHBlcmNhc2Ugc2hhZG93LWxnXFxcIj5cXG4gICAgICAgICAgICAgIHt0LmFjY2VwdH1cXG4gICAgICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgKX1cXG5cXG4gICAgICB7c2VsZWN0ZWRNZWRpYSAmJiA8U2VsZWN0ZWRNZWRpYSAvPn1cXG4gICAgPC9kaXY+XFxuICApO1xcbn1cXG5cXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBBcHAoKSB7XFxuICByZXR1cm4gKFxcbiAgICA8QXBwUHJvdmlkZXI+XFxuICAgICAgPEFwcENvbnRlbnQgLz5cXG4gICAgPC9BcHBQcm92aWRlcj5cXG4gICk7XFxufVwiIl0sImZpbGUiOiIvYXBwL2FwcGxldC9BcHAudHN4In0=