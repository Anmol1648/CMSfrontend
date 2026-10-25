/**
 * The product website's words, in English and Hindi (app/site). Contact details and links are in
 * SITE below; everything a visitor reads is here, so both languages stay in step.
 */

export type Lang = 'en' | 'hi';
export const LANGS: Lang[] = ['en', 'hi'];

export const SITE = {
  company: 'Klytos Labs',
  product: 'Klytos School ERP',
  phone: '+91 74529 38683',
  phoneRaw: '917452938683',
  email: 'anmolkothiyal2021@gmail.com',
  // Where "Login" goes: the shared address that asks for the school code (set NEXT_PUBLIC_APP_URL in production).
  appUrl: process.env.NEXT_PUBLIC_APP_URL || '/login',
  // A demo school to try (shown only when set).
  demoUrl: process.env.NEXT_PUBLIC_DEMO_URL || '',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || '',
};

/** Module groups shown on the home page and the features page (icons: Material Symbols). */
const MODULES = {
  en: [
    { icon: 'school', title: 'Academics', items: ['Classes, sections & subjects', 'Auto timetable & substitutions', 'Attendance: daily or period-wise', 'Homework & syllabus', 'Exams, marks & report cards', 'Admit cards, seating & invigilation'] },
    { icon: 'groups', title: 'Students & admissions', items: ['Online admission enquiries', 'Student records & documents', 'ID cards with QR', 'Promotion & transfer certificates', 'Discipline & positive notes', 'Parent–teacher meetings'] },
    { icon: 'payments', title: 'Fees & accounts', items: ['Fee structure & instalments', 'Counter receipts & concessions', 'Online payment: UPI, cards', 'Dues & defaulter reminders', 'Accounts: vouchers to balance sheet', 'Bank reconciliation'] },
    { icon: 'badge', title: 'Staff & payroll', items: ['Staff records & documents', 'Face / biometric check-in', 'Leave with approvals', 'Salaries, PF, ESI, TDS', 'Payslips & bank sheet', 'Loans & advances'] },
    { icon: 'apartment', title: 'Campus', items: ['Transport with live bus tracking', 'Hostel: rooms, roll call, gate pass', 'Mess: menu, headcount, counter', 'Library with barcodes', 'Store & inventory', 'Assets & visitors'] },
    { icon: 'forum', title: 'Communication', items: ['Notices & events calendar', 'Automatic alerts: app, email, SMS', 'Messages to classes & groups', 'Complaints with tracking', 'Teacher feedback', 'Shared files & circulars'] },
    { icon: 'smart_toy', title: 'AI built in', items: ['Ask the AI assistant anything about your school', 'AI tutor for students', 'Question papers made by AI', 'Online tests with auto-marking', 'Report card remarks', 'Smart dashboards'] },
  ],
  hi: [
    { icon: 'school', title: 'शैक्षणिक', items: ['कक्षाएँ, सेक्शन और विषय', 'ऑटो टाइमटेबल और सब्स्टीट्यूशन', 'उपस्थिति: रोज़ाना या पीरियड-वार', 'होमवर्क और सिलेबस', 'परीक्षा, अंक और रिपोर्ट कार्ड', 'एडमिट कार्ड, सीटिंग और ड्यूटी'] },
    { icon: 'groups', title: 'विद्यार्थी और प्रवेश', items: ['ऑनलाइन प्रवेश पूछताछ', 'विद्यार्थी रिकॉर्ड और दस्तावेज़', 'QR वाले पहचान पत्र', 'प्रमोशन और टीसी', 'अनुशासन और अच्छे काम', 'अभिभावक–शिक्षक बैठक'] },
    { icon: 'payments', title: 'फीस और लेखा', items: ['फीस ढाँचा और किस्तें', 'काउंटर रसीद और छूट', 'ऑनलाइन भुगतान: UPI, कार्ड', 'बकाया और याद दिलाना', 'लेखा: वाउचर से बैलेंस शीट तक', 'बैंक मिलान'] },
    { icon: 'badge', title: 'स्टाफ और वेतन', items: ['स्टाफ रिकॉर्ड और दस्तावेज़', 'फेस / बायोमेट्रिक हाज़िरी', 'मंज़ूरी के साथ छुट्टी', 'वेतन, PF, ESI, TDS', 'वेतन पर्ची और बैंक शीट', 'ऋण और एडवांस'] },
    { icon: 'apartment', title: 'परिसर', items: ['लाइव बस ट्रैकिंग के साथ परिवहन', 'छात्रावास: कमरे, रोल कॉल, गेट पास', 'मेस: मेन्यू, गिनती, काउंटर', 'बारकोड वाली लाइब्रेरी', 'स्टोर और इन्वेंट्री', 'संपत्ति और आगंतुक'] },
    { icon: 'forum', title: 'संवाद', items: ['सूचनाएँ और कार्यक्रम कैलेंडर', 'अपने-आप सूचनाएँ: ऐप, ईमेल, SMS', 'कक्षाओं और समूहों को संदेश', 'शिकायतें और उनकी स्थिति', 'शिक्षक फ़ीडबैक', 'साझा फ़ाइलें और परिपत्र'] },
    { icon: 'smart_toy', title: 'AI साथ में', items: ['AI सहायक से स्कूल के बारे में कुछ भी पूछें', 'विद्यार्थियों के लिए AI ट्यूटर', 'AI से प्रश्न-पत्र', 'अपने-आप जाँच वाले ऑनलाइन टेस्ट', 'रिपोर्ट कार्ड टिप्पणियाँ', 'स्मार्ट डैशबोर्ड'] },
  ],
};

const T = {
  en: {
    nav: { features: 'Features', modules: 'Modules', pricing: 'Pricing', security: 'Security', faq: 'FAQ', about: 'About', login: 'Login', demo: 'Book a demo' },
    hero: {
      badge: 'Made in India · for Indian schools',
      title: 'Run your entire school from one place',
      text: 'Admissions, attendance, fees, exams, timetable, transport, hostel, payroll and accounts, with AI built in. Simple for teachers, clear for parents, complete for the principal.',
      demo: 'Book a free demo',
      try: 'Try the live demo',
      trust: ['Data stored in India', 'CBSE & State boards', 'Works on any phone', 'Hindi & English'],
    },
    problem: {
      title: 'One system instead of registers, Excel sheets and WhatsApp groups',
      before: 'Before',
      after: 'With Klytos',
      rows: [
        ['Attendance in registers, totals by hand', 'Attendance in a minute; parents told of absence at once'],
        ['Fee receipts on paper, dues in Excel', 'Receipts printed, online payment, reminders sent automatically'],
        ['Report cards typed one by one', 'Marks entered once; report cards for the whole class in a click'],
        ['Notices lost in WhatsApp groups', 'Notices and alerts that reach every parent, with read status'],
        ['Salary worked out on a calculator', 'Payroll with PF, ESI, TDS and payslips each month'],
      ],
    },
    modulesTitle: 'Everything a school needs',
    modulesText: '25+ modules that work together. Start with what you need; switch on more any time.',
    roles: {
      title: 'Made for everyone in your school',
      list: [
        { icon: 'workspace_premium', who: 'Principal', what: 'The whole school on one dashboard: attendance, fees, results, staff and approvals waiting for you.' },
        { icon: 'desk', who: 'Office', what: 'Admissions, fee counter, ID cards, certificates and visitors without paperwork.' },
        { icon: 'account_balance', who: 'Accountant', what: 'Fees, accounts and payroll in one place, with every report ready for audit.' },
        { icon: 'co_present', who: 'Teacher', what: 'Attendance, homework, marks and timetable on the phone, in minutes.' },
        { icon: 'family_restroom', who: 'Parent', what: 'Attendance, homework, results, fees and the school bus, on the phone. Pay fees online.' },
        { icon: 'backpack', who: 'Student', what: 'Timetable, homework, online tests and an AI tutor to learn any chapter.' },
      ],
    },
    ai: {
      title: 'AI that knows your school',
      text: 'Ask in plain words, get answers from your own data, safely limited to what each person may see.',
      points: [
        ['smart_toy', 'AI assistant', '“Which sections have the most overdue fees?” “Who is on leave today?” Answers in seconds, with links.'],
        ['psychology', 'AI tutor', 'Students pick a subject and chapter, ask questions and practise with quizzes.'],
        ['quiz', 'Question papers', 'Teachers make question papers and tests in minutes from the syllabus.'],
      ],
    },
    highlights: {
      title: 'Why schools choose Klytos',
      list: [
        ['qr_code_2', 'Online fee payment', 'UPI, cards and netbanking through Razorpay, with receipts by email.'],
        ['directions_bus', 'Live bus tracking', 'Parents see the bus on a map and get told when it is near.'],
        ['face', 'Face & biometric check-in', 'Staff attendance from the phone or the school’s machine.'],
        ['dashboard_customize', 'Your own dashboard', 'Everyone sees what matters to them; build your own widgets and reports.'],
        ['translate', 'Your language, your names', 'Hindi and English, and rename any menu to your school’s words.'],
        ['phone_iphone', 'Works on every phone', 'No app to install: it works in any phone’s browser.'],
      ],
    },
    security: {
      title: 'Your data is safe with us',
      list: [
        ['lock', 'Every school kept apart', 'One school can never see another’s data; we test this before every release.'],
        ['admin_panel_settings', 'Role permissions', 'Each person sees only what their role allows: a teacher their classes, a parent their children.'],
        ['verified_user', 'Secure sign-in', 'Passwords kept encrypted, optional two-factor sign-in, sessions you can end anytime.'],
        ['backup', 'Daily backups', 'Your data is backed up every night and kept safely.'],
        ['history', 'Full history', 'Every change is recorded: who did what, and when.'],
        ['location_on', 'Stored in India', 'Your school’s data stays in India.'],
      ],
    },
    steps: {
      title: 'Live in about a week',
      list: [
        ['call', 'Talk to us', 'A short call to understand your school.'],
        ['tune', 'We set it up', 'Classes, fees, timetable and your school’s rules.'],
        ['upload_file', 'We bring your data', 'Students and staff from your Excel sheets.'],
        ['school', 'Training', 'Your office, teachers and accountant, in person or online.'],
        ['rocket_launch', 'Go live', 'Parents get their logins; we stay with you.'],
      ],
    },
    pricing: {
      title: 'Simple pricing',
      text: 'Pay per student per year, only for the modules you use. No hidden charges.',
      talk: 'Talk to us for a quote',
      plans: [
        { name: 'Starter', for: 'Small schools getting started', items: ['Students, staff & academics', 'Attendance & timetable', 'Fees with online payment', 'Notices & alerts', 'Parent & student access'] },
        { name: 'Standard', for: 'Most schools', items: ['Everything in Starter', 'Exams & report cards', 'Homework & online tests', 'Transport & library', 'Admissions & ID cards'], popular: true },
        { name: 'Complete', for: 'Large and boarding schools', items: ['Everything in Standard', 'Payroll & accounts', 'Hostel & mess', 'Inventory & assets', 'AI assistant & AI tutor'] },
      ],
      popular: 'Most popular',
      note: 'Setup, data import and training included. Pricing depends on the number of students and modules.',
    },
    faq: {
      title: 'Questions schools ask',
      list: [
        ['Do parents need to install an app?', 'No. It works in any phone’s browser, and can be added to the home screen like an app.'],
        ['Can we use only some modules?', 'Yes. Start with what you need and switch on more modules any time.'],
        ['Will you import our existing data?', 'Yes. We bring your students, staff and fee details from Excel sheets, and help with the rest.'],
        ['Does it work in Hindi?', 'Yes. The website and menus can be in Hindi or English, and you can rename any menu.'],
        ['Is our data safe?', 'Yes. Each school’s data is kept separate, backed up every night and stored in India.'],
        ['Which boards are supported?', 'CBSE, ICSE and State boards. Report cards and grading follow your board’s rules.'],
        ['What if we need help?', 'Call or WhatsApp us. We train your staff and stay with you after you go live.'],
      ],
    },
    cta: { title: 'See it for your school', text: 'A free 30-minute demo with your own classes, fees and timetable.', button: 'Book a free demo' },
    form: {
      title: 'Book a free demo',
      text: 'Tell us about your school. We will call you within one working day.',
      name: 'Your name', school: 'School name', city: 'City / town', phone: 'Phone / WhatsApp', email: 'Email (optional)', students: 'Number of students', board: 'Board', time: 'Best time to call', message: 'Anything you’d like us to know (optional)',
      boards: ['CBSE', 'ICSE', 'State board', 'Other'], times: ['Morning', 'Afternoon', 'Evening', 'Any time'],
      send: 'Request a demo', sending: 'Sending…', done: 'Thank you! We will call you soon.', doneText: 'You can also reach us right away on WhatsApp.', error: 'Couldn’t send. Please call or WhatsApp us.',
    },
    about: {
      title: 'About Klytos Labs',
      text: [
        'Klytos Labs builds software for Indian schools. We started with one question: why does a school still need registers, Excel sheets and ten different apps?',
        'Klytos School ERP brings everything a school does into one simple system, from the gate to the classroom to the accounts office, and puts it in the hands of parents and students on their phones.',
        'We work closely with every school: we set it up, bring in your data, train your staff and stay with you after you go live.',
      ],
      contact: 'Contact us',
    },
    footer: { tagline: 'School management for Indian schools.', product: 'Product', company: 'Company', legal: 'Legal', privacy: 'Privacy policy', terms: 'Terms of use', refund: 'Refund & cancellation', rights: 'All rights reserved.', contact: 'Contact' },
    whatsapp: 'Chat on WhatsApp',
    featuresTitle: 'Features',
    featuresText: 'Every module, and what it does for your school.',
    legalNote: '',
  },
  hi: {
    nav: { features: 'सुविधाएँ', modules: 'मॉड्यूल', pricing: 'कीमत', security: 'सुरक्षा', faq: 'सवाल', about: 'हमारे बारे में', login: 'लॉगिन', demo: 'डेमो बुक करें' },
    hero: {
      badge: 'भारत में बना · भारतीय स्कूलों के लिए',
      title: 'पूरा स्कूल, एक ही जगह से चलाएँ',
      text: 'प्रवेश, उपस्थिति, फीस, परीक्षा, टाइमटेबल, परिवहन, छात्रावास, वेतन और लेखा, साथ में AI। शिक्षकों के लिए आसान, अभिभावकों के लिए साफ़, प्रधानाचार्य के लिए पूरा।',
      demo: 'मुफ़्त डेमो बुक करें',
      try: 'लाइव डेमो देखें',
      trust: ['डेटा भारत में', 'CBSE और राज्य बोर्ड', 'हर फ़ोन पर चले', 'हिंदी और अंग्रेज़ी'],
    },
    problem: {
      title: 'रजिस्टर, एक्सेल शीट और व्हाट्सऐप ग्रुप की जगह एक सिस्टम',
      before: 'पहले',
      after: 'Klytos के साथ',
      rows: [
        ['रजिस्टर में हाज़िरी, हाथ से जोड़', 'एक मिनट में हाज़िरी; अनुपस्थिति पर अभिभावक को तुरंत सूचना'],
        ['कागज़ पर रसीद, एक्सेल में बकाया', 'छपी रसीद, ऑनलाइन भुगतान, अपने-आप याद दिलाना'],
        ['एक-एक करके रिपोर्ट कार्ड टाइप', 'अंक एक बार; पूरी कक्षा के रिपोर्ट कार्ड एक क्लिक में'],
        ['व्हाट्सऐप ग्रुप में खोती सूचनाएँ', 'हर अभिभावक तक पहुँचने वाली सूचनाएँ, पढ़ी गईं या नहीं यह भी'],
        ['कैलकुलेटर पर वेतन', 'हर महीने PF, ESI, TDS और वेतन पर्ची के साथ वेतन'],
      ],
    },
    modulesTitle: 'स्कूल की हर ज़रूरत',
    modulesText: '25 से ज़्यादा मॉड्यूल जो साथ मिलकर काम करते हैं। जो चाहिए उससे शुरू करें; बाक़ी कभी भी चालू करें।',
    roles: {
      title: 'स्कूल में हर किसी के लिए',
      list: [
        { icon: 'workspace_premium', who: 'प्रधानाचार्य', what: 'पूरा स्कूल एक डैशबोर्ड पर: उपस्थिति, फीस, परिणाम, स्टाफ और आपकी मंज़ूरी के काम।' },
        { icon: 'desk', who: 'कार्यालय', what: 'प्रवेश, फीस काउंटर, पहचान पत्र, प्रमाण पत्र और आगंतुक, बिना कागज़ी काम के।' },
        { icon: 'account_balance', who: 'लेखाकार', what: 'फीस, लेखा और वेतन एक जगह, ऑडिट के लिए हर रिपोर्ट तैयार।' },
        { icon: 'co_present', who: 'शिक्षक', what: 'उपस्थिति, होमवर्क, अंक और टाइमटेबल फ़ोन पर, मिनटों में।' },
        { icon: 'family_restroom', who: 'अभिभावक', what: 'उपस्थिति, होमवर्क, परिणाम, फीस और स्कूल बस, फ़ोन पर। फीस ऑनलाइन भरें।' },
        { icon: 'backpack', who: 'विद्यार्थी', what: 'टाइमटेबल, होमवर्क, ऑनलाइन टेस्ट और किसी भी अध्याय के लिए AI ट्यूटर।' },
      ],
    },
    ai: {
      title: 'AI जो आपके स्कूल को जानता है',
      text: 'आसान शब्दों में पूछें, अपने ही डेटा से जवाब पाएँ, और हर व्यक्ति को सिर्फ़ उतना जितना उसे देखने की अनुमति है।',
      points: [
        ['smart_toy', 'AI सहायक', '“किन सेक्शनों की सबसे ज़्यादा फीस बकाया है?” “आज छुट्टी पर कौन है?” सेकंडों में जवाब, लिंक के साथ।'],
        ['psychology', 'AI ट्यूटर', 'विद्यार्थी विषय और अध्याय चुनें, सवाल पूछें और क्विज़ से अभ्यास करें।'],
        ['quiz', 'प्रश्न-पत्र', 'शिक्षक सिलेबस से मिनटों में प्रश्न-पत्र और टेस्ट बनाएँ।'],
      ],
    },
    highlights: {
      title: 'स्कूल Klytos क्यों चुनते हैं',
      list: [
        ['qr_code_2', 'ऑनलाइन फीस भुगतान', 'Razorpay से UPI, कार्ड और नेटबैंकिंग, रसीद ईमेल पर।'],
        ['directions_bus', 'लाइव बस ट्रैकिंग', 'अभिभावक नक्शे पर बस देखें और पास आने पर सूचना पाएँ।'],
        ['face', 'फेस और बायोमेट्रिक हाज़िरी', 'फ़ोन से या स्कूल की मशीन से स्टाफ की हाज़िरी।'],
        ['dashboard_customize', 'अपना डैशबोर्ड', 'हर किसी को उसके काम की चीज़ें; अपने विजेट और रिपोर्ट ख़ुद बनाएँ।'],
        ['translate', 'आपकी भाषा, आपके नाम', 'हिंदी और अंग्रेज़ी, और किसी भी मेन्यू को अपने स्कूल के शब्दों में बदलें।'],
        ['phone_iphone', 'हर फ़ोन पर चले', 'कोई ऐप डाउनलोड नहीं: किसी भी फ़ोन के ब्राउज़र में चलता है।'],
      ],
    },
    security: {
      title: 'आपका डेटा हमारे पास सुरक्षित है',
      list: [
        ['lock', 'हर स्कूल अलग', 'कोई स्कूल दूसरे स्कूल का डेटा कभी नहीं देख सकता; हर बदलाव से पहले हम इसकी जाँच करते हैं।'],
        ['admin_panel_settings', 'भूमिका के अनुसार अनुमति', 'हर व्यक्ति सिर्फ़ वही देखे जो उसकी भूमिका में है: शिक्षक अपनी कक्षाएँ, अभिभावक अपने बच्चे।'],
        ['verified_user', 'सुरक्षित लॉगिन', 'पासवर्ड एन्क्रिप्टेड, वैकल्पिक दो-स्तरीय लॉगिन, सेशन कभी भी बंद करें।'],
        ['backup', 'रोज़ बैकअप', 'आपके डेटा का हर रात बैकअप होता है और सुरक्षित रखा जाता है।'],
        ['history', 'पूरा इतिहास', 'हर बदलाव दर्ज होता है: किसने, क्या, कब।'],
        ['location_on', 'भारत में', 'आपके स्कूल का डेटा भारत में ही रहता है।'],
      ],
    },
    steps: {
      title: 'लगभग एक हफ़्ते में शुरू',
      list: [
        ['call', 'हमसे बात करें', 'आपके स्कूल को समझने के लिए एक छोटी कॉल।'],
        ['tune', 'हम सेट-अप करते हैं', 'कक्षाएँ, फीस, टाइमटेबल और आपके स्कूल के नियम।'],
        ['upload_file', 'आपका डेटा हम लाते हैं', 'आपकी एक्सेल शीट से विद्यार्थी और स्टाफ।'],
        ['school', 'प्रशिक्षण', 'कार्यालय, शिक्षक और लेखाकार, सामने या ऑनलाइन।'],
        ['rocket_launch', 'शुरू', 'अभिभावकों को लॉगिन मिलते हैं; हम आपके साथ रहते हैं।'],
      ],
    },
    pricing: {
      title: 'सीधी कीमत',
      text: 'प्रति विद्यार्थी प्रति वर्ष, सिर्फ़ उन मॉड्यूल का जो आप इस्तेमाल करें। कोई छिपा शुल्क नहीं।',
      talk: 'कीमत के लिए बात करें',
      plans: [
        { name: 'स्टार्टर', for: 'शुरुआत करने वाले छोटे स्कूल', items: ['विद्यार्थी, स्टाफ और शैक्षणिक', 'उपस्थिति और टाइमटेबल', 'ऑनलाइन भुगतान के साथ फीस', 'सूचनाएँ और अलर्ट', 'अभिभावक और विद्यार्थी लॉगिन'] },
        { name: 'स्टैंडर्ड', for: 'ज़्यादातर स्कूल', items: ['स्टार्टर की हर चीज़', 'परीक्षा और रिपोर्ट कार्ड', 'होमवर्क और ऑनलाइन टेस्ट', 'परिवहन और लाइब्रेरी', 'प्रवेश और पहचान पत्र'], popular: true },
        { name: 'कम्प्लीट', for: 'बड़े और आवासीय स्कूल', items: ['स्टैंडर्ड की हर चीज़', 'वेतन और लेखा', 'छात्रावास और मेस', 'इन्वेंट्री और संपत्ति', 'AI सहायक और AI ट्यूटर'] },
      ],
      popular: 'सबसे लोकप्रिय',
      note: 'सेट-अप, डेटा इम्पोर्ट और प्रशिक्षण शामिल। कीमत विद्यार्थियों की संख्या और मॉड्यूल पर निर्भर है।',
    },
    faq: {
      title: 'स्कूल जो पूछते हैं',
      list: [
        ['क्या अभिभावकों को ऐप डाउनलोड करना होगा?', 'नहीं। यह किसी भी फ़ोन के ब्राउज़र में चलता है, और ऐप की तरह होम स्क्रीन पर जोड़ा जा सकता है।'],
        ['क्या हम कुछ ही मॉड्यूल ले सकते हैं?', 'हाँ। जो चाहिए उससे शुरू करें और बाक़ी मॉड्यूल कभी भी चालू करें।'],
        ['क्या आप हमारा पुराना डेटा लाएँगे?', 'हाँ। विद्यार्थी, स्टाफ और फीस की जानकारी एक्सेल से हम लाते हैं, और बाक़ी में मदद करते हैं।'],
        ['क्या यह हिंदी में चलता है?', 'हाँ। वेबसाइट और मेन्यू हिंदी या अंग्रेज़ी में, और आप किसी भी मेन्यू का नाम बदल सकते हैं।'],
        ['क्या हमारा डेटा सुरक्षित है?', 'हाँ। हर स्कूल का डेटा अलग रखा जाता है, हर रात बैकअप होता है और भारत में रहता है।'],
        ['कौन-से बोर्ड?', 'CBSE, ICSE और राज्य बोर्ड। रिपोर्ट कार्ड और ग्रेडिंग आपके बोर्ड के नियमों से।'],
        ['मदद चाहिए तो?', 'हमें कॉल या व्हाट्सऐप करें। हम आपके स्टाफ को सिखाते हैं और शुरू होने के बाद भी साथ रहते हैं।'],
      ],
    },
    cta: { title: 'अपने स्कूल के लिए देखें', text: 'आपकी अपनी कक्षाओं, फीस और टाइमटेबल के साथ 30 मिनट का मुफ़्त डेमो।', button: 'मुफ़्त डेमो बुक करें' },
    form: {
      title: 'मुफ़्त डेमो बुक करें',
      text: 'अपने स्कूल के बारे में बताएँ। हम एक कार्य-दिवस में कॉल करेंगे।',
      name: 'आपका नाम', school: 'स्कूल का नाम', city: 'शहर / कस्बा', phone: 'फ़ोन / व्हाट्सऐप', email: 'ईमेल (वैकल्पिक)', students: 'विद्यार्थियों की संख्या', board: 'बोर्ड', time: 'कॉल का सही समय', message: 'कुछ और बताना हो (वैकल्पिक)',
      boards: ['CBSE', 'ICSE', 'राज्य बोर्ड', 'अन्य'], times: ['सुबह', 'दोपहर', 'शाम', 'कभी भी'],
      send: 'डेमो का अनुरोध करें', sending: 'भेज रहे हैं…', done: 'धन्यवाद! हम जल्द ही कॉल करेंगे।', doneText: 'आप हमें अभी व्हाट्सऐप पर भी लिख सकते हैं।', error: 'भेजा नहीं जा सका। कृपया कॉल या व्हाट्सऐप करें।',
    },
    about: {
      title: 'Klytos Labs के बारे में',
      text: [
        'Klytos Labs भारतीय स्कूलों के लिए सॉफ़्टवेयर बनाता है। हमने एक सवाल से शुरुआत की: आज भी स्कूल को रजिस्टर, एक्सेल शीट और दस अलग-अलग ऐप क्यों चाहिए?',
        'Klytos School ERP स्कूल का हर काम एक आसान सिस्टम में लाता है, गेट से कक्षा तक और लेखा कार्यालय तक, और अभिभावकों व विद्यार्थियों के फ़ोन तक पहुँचाता है।',
        'हम हर स्कूल के साथ मिलकर काम करते हैं: सेट-अप करते हैं, आपका डेटा लाते हैं, स्टाफ को सिखाते हैं और शुरू होने के बाद भी साथ रहते हैं।',
      ],
      contact: 'संपर्क करें',
    },
    footer: { tagline: 'भारतीय स्कूलों के लिए स्कूल प्रबंधन।', product: 'प्रोडक्ट', company: 'कंपनी', legal: 'कानूनी', privacy: 'गोपनीयता नीति', terms: 'उपयोग की शर्तें', refund: 'रिफ़ंड और रद्दीकरण', rights: 'सर्वाधिकार सुरक्षित।', contact: 'संपर्क' },
    whatsapp: 'व्हाट्सऐप पर बात करें',
    featuresTitle: 'सुविधाएँ',
    featuresText: 'हर मॉड्यूल, और यह आपके स्कूल के लिए क्या करता है।',
    legalNote: 'यह पृष्ठ अंग्रेज़ी में है; अंग्रेज़ी संस्करण ही मान्य है।',
  },
};

export const t = (lang: Lang) => T[lang];
export const modules = (lang: Lang) => MODULES[lang];
export const isLang = (x: string): x is Lang => (LANGS as string[]).includes(x);
