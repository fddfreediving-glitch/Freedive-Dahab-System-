export type Language = 'en' | 'ar';

export const translations = {
  en: {
    appName: 'Freedive Dahab',
    appSubtitle: 'ERP & Operations System',
    location: 'Dahab, South Sinai, Egypt',
    timezoneNotice: 'Local Time (Africa/Cairo UTC+2)',
    redSeaConditions: 'Red Sea Conditions',
    waterTemp: '24°C Water',
    visibility: '30m+ Visibility',
    currentWind: 'North 8 kts (Calm)',

    // Navigation
    navDashboard: 'Dashboard',
    navStudentsCRM: 'Students & CRM',
    navCourses: 'Courses & Catalog',
    navCalendar: 'Operations Calendar',
    navDailyOps: 'Ocean Activity Board',
    navStaff: 'Instructors & Staff',
    navFinance: 'Finance & Invoices',
    navPayroll: 'Staff Payroll',
    navEquipment: 'Gear & Equipment',
    navAudit: 'Audit Trail',
    navSettings: 'Center Settings',

    // Roles
    roleOwner: 'Center Owner',
    roleOpsManager: 'Operations Manager',
    roleFrontDesk: 'Front Desk / CRM',
    roleInstructor: 'Senior Instructor',
    roleFinance: 'Finance Manager',
    roleHR: 'Human Resources',
    roleEquipmentManager: 'Equipment Manager',

    // Role switcher banner
    activeRoleNotice: 'Role Access Simulation',
    switchRolePrompt: 'Test different staff role permissions on the real server:',
    permissionRestrictedNotice: 'Server authorization strictly restricts modules & data based on active role.',

    // Common Actions
    create: 'Create',
    edit: 'Edit',
    save: 'Save Changes',
    cancel: 'Cancel',
    delete: 'Delete',
    search: 'Search...',
    filter: 'Filter',
    exportBackup: 'Export Database Backup',
    status: 'Status',
    actions: 'Actions',
    close: 'Close',
    refresh: 'Refresh Data',
    confirmed: 'Confirmed',
    pending: 'Pending',
    active: 'Active',
    signed: 'Signed & Cleared',
    waiverMissing: 'Waiver Pending',

    // Specific terms
    blueHole: 'Blue Hole',
    lighthouse: 'Lighthouse Bay',
    eelGarden: 'Eel Garden',
    theCanyon: 'The Canyon',
    theBells: 'The Bells',
    rasAbuGalum: 'Ras Abu Galum',
  },
  ar: {
    appName: 'فريدايف دهب',
    appSubtitle: 'نظام إدارة العمليات وخدمة العملاء',
    location: 'دهب، جنوب سيناء، مصر',
    timezoneNotice: 'التوقيت المحلي (أفريقيا/القاهرة)',
    redSeaConditions: 'أحوال البحر الأحمر',
    waterTemp: 'حرارة الماء ٢٤° م',
    visibility: 'الرؤية +٣٠ متر',
    currentWind: 'رياح شمالية ٨ عقد (هادئ)',

    // Navigation
    navDashboard: 'لوحة التحكم',
    navStudentsCRM: 'الطلاب والعملاء',
    navCourses: 'الدورات والبرامج',
    navCalendar: 'جدول العمليات',
    navDailyOps: 'سجل الأنشطة البحرية',
    navStaff: 'المدربون وطاقم العمل',
    navFinance: 'المالية والفواتير',
    navPayroll: 'كشف المرتبات',
    navEquipment: 'المعدات والمخزون',
    navAudit: 'سجل التدقيق الأمني',
    navSettings: 'إعدادات المركز',

    // Roles
    roleOwner: 'مالك المركز',
    roleOpsManager: 'مدير العمليات',
    roleFrontDesk: 'الاستقبال والعملاء',
    roleInstructor: 'مدرب غوص حر',
    roleFinance: 'المدير المالي',
    roleHR: 'الموارد البشرية',
    roleEquipmentManager: 'مسؤول المعدات',

    // Role switcher banner
    activeRoleNotice: 'محاكاة صلاحيات الأدوار',
    switchRolePrompt: 'تجربة صلاحيات الطاقم المختلفة على الخادم الفعلي:',
    permissionRestrictedNotice: 'التحقق الأمني على الخادم يقيد الوصول للبيانات والوحدات حسب الدور الفعلي.',

    // Common Actions
    create: 'إضافة جديد',
    edit: 'تعديل',
    save: 'حفظ التغييرات',
    cancel: 'إلغاء',
    delete: 'حذف',
    search: 'بحث...',
    filter: 'تصفية',
    exportBackup: 'تصدير نسخة احتياطية',
    status: 'الحالة',
    actions: 'إجراءات',
    close: 'إغلاق',
    refresh: 'تحديث البيانات',
    confirmed: 'مؤكد',
    pending: 'قيد الانتظار',
    active: 'نشط',
    signed: 'موقّع وموافق عليه',
    waiverMissing: 'الإقرار الطبي معلّق',

    // Specific terms
    blueHole: 'البلو هول (الثقب الأزرق)',
    lighthouse: 'خليج اللايتهاوس',
    eelGarden: 'حديقة الإنقليس (إيل جاردن)',
    theCanyon: 'الكانيون',
    theBells: 'البلز (الأجراس)',
    rasAbuGalum: 'رأس أبو جالوم',
  },
};
