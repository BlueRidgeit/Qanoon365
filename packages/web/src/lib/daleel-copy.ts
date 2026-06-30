"use client";

export type DaleelLocale = "ar" | "en";

export const defaultDaleelLocale: DaleelLocale = "ar";

export const daleelLocaleLabels: Record<DaleelLocale, string> = {
  ar: "العربية",
  en: "English",
};

export const daleelStarterPrompts: Record<DaleelLocale, string[]> = {
  ar: [
    "ما القضايا أو المستندات المتاحة لي اليوم؟",
    "ابحث عن ملف له علاقة بتنفيذ مدني واذكر الرابط الأصلي.",
    "اقرأ هذا المستند بالتفصيل واشرح أهم النقاط القانونية.",
  ],
  en: [
    "What cases or documents are available to me today?",
    "Find a file related to civil execution and include the original link.",
    "Read this document in detail and explain the key legal points.",
  ],
};

export const daleelCopy = {
  ar: {
    title: "دليل",
    cards: [
      {
        title: "البحث في المستودع",
        description:
          "يعتمد على Azure AI Search للوصول السريع إلى المستندات القانونية المفهرسة.",
      },
      {
        title: "قراءة المستند",
        description:
          "يستخدم أداة قراءة مخصصة للتحليل الأعمق على مستوى الملف.",
      },
      {
        title: "البحث العام على الويب",
        description:
          "يستخدم فقط عندما تكون الإجابة بحاجة إلى معلومات عامة وحديثة من المصادر العامة.",
      },
    ],
    starterPromptLabel: "مطالبات البداية",
    composerPlaceholder: "اسأل دليل عن قضية أو جلسة أو مستند أو تطور قانوني عام...",
    welcomeBadge: "مساعد قانوني موثّق",
    welcomeTitle: "ابدأ من ملف أو قضية أو سؤال قانوني.",
    welcomeDescription:
      "يبدأ دليل بالبحث في المستودع القانوني المشترك، ثم ينتقل إلى قراءة مستند محدد عندما تحتاج إلى مراجعة أعمق.",
    scrollToBottom: "الانتقال إلى الأسفل",
    send: "إرسال الرسالة",
    stop: "إيقاف التوليد",
    addAttachment: "إضافة مرفق",
    authSetupPending: "إعداد مصادقة دليل غير مكتمل",
    authSignedIn: "تم الربط مع Microsoft",
    authSignedOut: "غير مرتبط",
    signIn: "تسجيل الدخول",
    signOut: "تسجيل الخروج",
    liveAccessReady:
      "المحادثات وسجل الدردشة وصلاحيات SharePoint متاحة من خلال هوية Microsoft المرتبطة.",
    liveAccessRequiresSignIn:
      "اربط حساب Microsoft للوصول إلى سجل الدردشة المشترك وقراءة SharePoint حسب صلاحياتك.",
    navNewChat: "محادثة جديدة",
    navHistory: "سجل المحادثات",
    navCollapsePanel: "إخفاء اللوحة الجانبية",
    navExpandPanel: "إظهار اللوحة الجانبية",
    navComingSoon: "قريبًا",
    navEmptyHistory: "لا توجد محادثات محفوظة بعد.",
    navLoading: "جارٍ التحميل...",
    accountSection: "الحساب",
    lockedTitle: "يلزم ربط Microsoft للوصول إلى دليل",
    lockedDescription:
      "يجب ربط حساب Microsoft أولًا حتى يتمكن دليل من استخدام سجل المحادثات المشترك وصلاحيات SharePoint الخاصة بك بشكل آمن.",
    lockedButton: "المتابعة إلى تسجيل الدخول",
    supportPanelTitle: "لوحة المساعدة",
    supportPanelDescription:
      "يمكنك تصغير هذه اللوحة أو توسيعها للوصول إلى التوجيهات السريعة ومطالبات البداية.",
  },
  en: {
    title: "Daleel",
    cards: [
      {
        title: "Repository search",
        description:
          "Uses Azure AI Search for fast retrieval across the indexed legal corpus.",
      },
      {
        title: "Document reading",
        description:
          "Reads the selected file more deeply when the answer needs grounded analysis.",
      },
      {
        title: "Public web research",
        description:
          "Used only when the answer needs current public information from the web.",
      },
    ],
    starterPromptLabel: "Starter prompts",
    composerPlaceholder:
      "Ask Daleel about a matter, case, document, or public legal development...",
    welcomeBadge: "Grounded Legal Assistant",
    welcomeTitle: "Start with a file, case, or legal question.",
    welcomeDescription:
      "Daleel starts with the shared legal repository, then moves into specific document review when deeper analysis is needed.",
    scrollToBottom: "Scroll to bottom",
    send: "Send message",
    stop: "Stop generating",
    addAttachment: "Add attachment",
    authSetupPending: "Daleel auth setup pending",
    authSignedIn: "Connected to Microsoft",
    authSignedOut: "Not connected",
    signIn: "Sign in",
    signOut: "Sign out",
    liveAccessReady:
      "Shared chat history and SharePoint access are enabled for this Microsoft identity.",
    liveAccessRequiresSignIn:
      "Connect Microsoft to unlock shared chat history and SharePoint access with your own permissions.",
    navNewChat: "New chat",
    navHistory: "Chat history",
    navCollapsePanel: "Collapse side panel",
    navExpandPanel: "Expand side panel",
    navComingSoon: "Coming soon",
    navEmptyHistory: "No saved chats yet.",
    navLoading: "Loading...",
    accountSection: "Account",
    lockedTitle: "Connect Microsoft to access Daleel",
    lockedDescription:
      "Daleel needs your Microsoft identity before it can restore shared chats, read SharePoint files securely, and apply your document permissions.",
    lockedButton: "Continue to sign in",
    supportPanelTitle: "Assistant panel",
    supportPanelDescription:
      "Collapse or expand this panel for quick guidance and starter prompts.",
  },
} as const;
