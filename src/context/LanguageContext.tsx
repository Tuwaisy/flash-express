import React, { createContext, useContext, useState, useEffect } from 'react';
import { getFromStorage, saveToStorage } from '../utils/storage';

export type Language = 'en' | 'ar';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
    direction: 'ltr' | 'rtl';
}

const translations = {
    en: {
        // Navigation
        'nav.dashboard': 'Dashboard',
        'nav.myShipments': 'My Shipments',
        'nav.createShipment': 'Create Shipment',
        'nav.myWallet': 'My Wallet',
        'nav.myFinancials': 'My Financials',
        'nav.clientRevenue': 'Client Revenue',
        'nav.myTasks': 'My Tasks',
        'nav.completedOrders': 'Completed Orders',
        'nav.myEarnings': 'My Earnings',
        'nav.deliveredShipments': 'Delivered Shipments',
        'nav.couriersByZone': 'Couriers By Zone',
        'nav.myProfile': 'My Profile',
        'nav.myAssets': 'My Assets',
        'nav.allShipments': 'All Shipments',
        'nav.packagingAssignment': 'Packaging & Assignment',
        'nav.deliveryManagement': 'Delivery Management',
        'nav.userManagement': 'User Management',
        'nav.roleManagement': 'Role Management',
        'nav.partnerTiers': 'Partner Tiers',
        'nav.inventory': 'Inventory',
        'nav.assetManagement': 'Asset Management',
        'nav.supplierManagement': 'Supplier Management',
        'nav.clientAnalytics': 'Client Analytics',
        'nav.courierPerformance': 'Courier Performance',
        'nav.financials': 'Financials',
        'nav.adminFinancials': 'Admin Financials',
        'nav.totalShipments': 'Total Shipments',
        'nav.notificationsLog': 'Notifications Log',

        // Common
        'common.submit': 'Submit',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.edit': 'Edit',
        'common.delete': 'Delete',
        'common.add': 'Add',
        'common.update': 'Update',
        'common.search': 'Search',
        'common.filter': 'Filter',
        'common.export': 'Export',
        'common.import': 'Import',
        'common.close': 'Close',
        'common.confirm': 'Confirm',
        'common.yes': 'Yes',
        'common.no': 'No',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.success': 'Success',
        'common.warning': 'Warning',
        'common.info': 'Information',

        // Dashboard
        'dashboard.title': 'Dashboard',
        'dashboard.overview': 'Overview',
        'dashboard.recentShipments': 'Recent Shipments',
        'dashboard.quickActions': 'Quick Actions',

        // Shipments
        'shipments.title': 'Shipments',
        'shipments.id': 'Shipment ID',
        'shipments.recipient': 'Recipient',
        'shipments.status': 'Status',
        'shipments.duration': 'Duration',
        'shipments.price': 'Price',
        'shipments.creationDate': 'Creation Date',
        'shipments.overdue': 'OVERDUE',
        'shipments.warning': 'WARNING',

        // Create Shipment
        'createShipments': 'Create Shipments',
        'createSingleShipment': 'Create Single Shipment',
        'bulkUploadShipments': 'Bulk Upload Shipments',
        'createShipmentForClient': 'Create Shipment For Client',
        'selectClient': 'Select a client...',
        'recipientName': 'Recipient Name',
        'recipientPhone': 'Recipient Phone',
        'recipientAddress': 'Recipient Street Address',
        'zone': 'Zone',
        'packageDescription': 'Package Description',
        'paymentMethod': 'Payment Method',
        'priority': 'Priority',
        'packageValue': 'Package Value',
        'phoneValidation': 'Must be exactly 11 digits (01000909899)',
        'downloadTemplate': 'Download Template',
        'uploadFile': 'Upload File',

        // Profile
        'myProfile': 'My Profile',
        'viewEditPersonalInfo': 'View and edit your personal information and default address.',
        'editProfile': 'Edit Profile',
        'personalInformation': 'Personal Information',
        'fullName': 'Full Name',
        'emailAddress': 'Email Address',
        'phoneNumber': 'Phone Number',
        'phoneExample': 'Example for Egyptian number: 01012345678',
        'role': 'Role',
        'notSet': 'Not set',
        'saveChanges': 'Save Changes',
        'profile.subtitle': 'View and edit your personal information and default address.',
        'profile.editProfile': 'Edit Profile',
        'profile.personalInfo': 'Personal Information',
        'profile.defaultAddress': 'Default Pickup Address',
        'profile.name': 'Name',
        'profile.email': 'Email',
        'profile.phone': 'Phone',
        'profile.street': 'Street',
        'profile.city': 'City',
        'profile.details': 'Details',

        // Wallet
        'wallet.title': 'My Wallet',
        'wallet.balance': 'Current Balance',
        'wallet.transactions': 'Transactions',
        'wallet.requestPayout': 'Request Payout',
        'wallet.availableBalance': 'Available Balance',
        'wallet.pendingPayouts': 'Pending Payouts',
        'wallet.transactionHistory': 'Transaction History',
        'wallet.amount': 'Amount',
        'wallet.date': 'Date',
        'wallet.type': 'Type',
        'wallet.status': 'Status',

        // Dashboard screens
        'dashboard.welcomeBack': 'Welcome back',
        'dashboard.quickStats': 'Quick Stats',
        'dashboard.recentActivity': 'Recent Activity',
        'dashboard.totalRevenue': 'Total Revenue',
        'dashboard.activeShipments': 'Active Shipments',
        'dashboard.completedToday': 'Completed Today',

        // Client Revenue
        'clientRevenue.title': 'Client Revenue',
        'clientRevenue.totalEarnings': 'Total Earnings',
        'clientRevenue.monthlyBreakdown': 'Monthly Breakdown',
        'clientRevenue.revenueAnalysis': 'Revenue Analysis',

        // Courier views
        'myTasks.title': 'My Tasks',
        'myTasks.assignedToday': 'Assigned Today',
        'myTasks.pending': 'Pending Tasks',
        'myTasks.inProgress': 'In Progress',
        'completedOrders.title': 'Completed Orders',
        'completedOrders.today': 'Today',
        'completedOrders.thisWeek': 'This Week',
        'completedOrders.thisMonth': 'This Month',
        'myEarnings.title': 'My Earnings',
        'myEarnings.totalEarnings': 'Total Earnings',
        'myEarnings.commissionRate': 'Commission Rate',

        // Management views
        'deliveredShipments.title': 'Delivered Shipments',
        'couriersByZone.title': 'Couriers By Zone',
        'myAssets.title': 'My Assets',
        'allShipments.title': 'All Shipments',
        'packagingAssignment.title': 'Packaging & Assignment',
        'deliveryManagement.title': 'Delivery Management',
        'userManagement.title': 'User Management',
        'roleManagement.title': 'Role Management',
        'partnerTiers.title': 'Partner Tiers',
        'inventory.title': 'Inventory',
        'assetManagement.title': 'Asset Management',
        'supplierManagement.title': 'Supplier Management',
        'courierPerformance.title': 'Courier Performance',
        'adminFinancials.title': 'Admin Financials',
        'totalShipments.title': 'Total Shipments',
        'notificationsLog.title': 'Notifications Log',

        // Common table headers
        'table.id': 'ID',
        'table.name': 'Name',
        'table.email': 'Email',
        'table.phone': 'Phone',
        'table.address': 'Address',
        'table.city': 'City',
        'table.zone': 'Zone',
        'table.status': 'Status',
        'table.date': 'Date',
        'table.amount': 'Amount',
        'table.actions': 'Actions',
        'table.view': 'View',
        'table.edit': 'Edit',
        'table.delete': 'Delete',

        // Form fields
        'form.street': 'Street Address',
        'form.city': 'City',
        'form.zone': 'Zone',
        'form.details': 'Additional Details',
        'form.description': 'Description',
        'form.value': 'Value',
        'form.priority': 'Priority',
        'form.required': 'Required',
        'form.optional': 'Optional',

        // Client Analytics
        'clientAnalytics.title': 'Client Analytics',
        'clientAnalytics.client': 'Client',
        'clientAnalytics.totalShipments': 'Total Shipments',
        'clientAnalytics.walletBalance': 'Wallet Balance',
        'clientAnalytics.partnerTier': 'Partner Tier',
        'clientAnalytics.flatRate': 'Flat Rate',
        'clientAnalytics.pendingPayouts': 'Pending Payouts',
        'clientAnalytics.actions': 'Actions',
        'clientAnalytics.viewShipments': 'View Shipments',

        // Status
        'status.pending': 'Pending',
        'status.assigned': 'Assigned',
        'status.pickedUp': 'Picked Up',
        'status.inTransit': 'In Transit',
        'status.outForDelivery': 'Out for Delivery',
        'status.delivered': 'Delivered',
        'status.deliveryFailed': 'Delivery Failed',
        'status.returned': 'Returned',

        // Payment Methods
        'payment.cod': 'Cash on Delivery',
        'payment.transfer': 'Transfer',
        'payment.wallet': 'Wallet',

        // Priority
        'priority.standard': 'Standard',
        'priority.urgent': 'Urgent',
        'priority.express': 'Express',
    },
    ar: {
        // Navigation
        'nav.dashboard': 'لوحة التحكم',
        'nav.myShipments': 'شحناتي',
        'nav.createShipment': 'إنشاء شحنة',
        'nav.myWallet': 'محفظتي',
        'nav.myFinancials': 'مالياتي',
        'nav.clientRevenue': 'إيرادات العميل',
        'nav.myTasks': 'مهامي',
        'nav.completedOrders': 'الطلبات المكتملة',
        'nav.myEarnings': 'أرباحي',
        'nav.deliveredShipments': 'الشحنات المسلمة',
        'nav.couriersByZone': 'المناديب حسب المنطقة',
        'nav.myProfile': 'ملفي الشخصي',
        'nav.myAssets': 'أصولي',
        'nav.allShipments': 'جميع الشحنات',
        'nav.packagingAssignment': 'التعبئة والتوزيع',
        'nav.deliveryManagement': 'إدارة التسليم',
        'nav.userManagement': 'إدارة المستخدمين',
        'nav.roleManagement': 'إدارة الأدوار',
        'nav.partnerTiers': 'مستويات الشراكة',
        'nav.inventory': 'المخزون',
        'nav.assetManagement': 'إدارة الأصول',
        'nav.supplierManagement': 'إدارة الموردين',
        'nav.clientAnalytics': 'تحليلات العملاء',
        'nav.courierPerformance': 'أداء المناديب',
        'nav.financials': 'الماليات',
        'nav.adminFinancials': 'الماليات الإدارية',
        'nav.totalShipments': 'إجمالي الشحنات',
        'nav.notificationsLog': 'سجل الإشعارات',

        // Common
        'common.submit': 'إرسال',
        'common.cancel': 'إلغاء',
        'common.save': 'حفظ',
        'common.edit': 'تعديل',
        'common.delete': 'حذف',
        'common.add': 'إضافة',
        'common.update': 'تحديث',
        'common.search': 'بحث',
        'common.filter': 'تصفية',
        'common.export': 'تصدير',
        'common.import': 'استيراد',
        'common.close': 'إغلاق',
        'common.confirm': 'تأكيد',
        'common.yes': 'نعم',
        'common.no': 'لا',
        'common.loading': 'جاري التحميل...',
        'common.error': 'خطأ',
        'common.success': 'نجح',
        'common.warning': 'تحذير',
        'common.info': 'معلومات',

        // Dashboard
        'dashboard.title': 'لوحة التحكم',
        'dashboard.overview': 'نظرة عامة',
        'dashboard.recentShipments': 'الشحنات الأخيرة',
        'dashboard.quickActions': 'إجراءات سريعة',

        // Shipments
        'shipments.title': 'الشحنات',
        'shipments.id': 'رقم الشحنة',
        'shipments.recipient': 'المستلم',
        'shipments.status': 'الحالة',
        'shipments.duration': 'المدة',
        'shipments.price': 'السعر',
        'shipments.creationDate': 'تاريخ الإنشاء',
        'shipments.overdue': 'متأخرة',
        'shipments.warning': 'تحذير',

        // Create Shipment
        'createShipments': 'إنشاء الشحنات',
        'createSingleShipment': 'إنشاء شحنة واحدة',
        'bulkUploadShipments': 'رفع الشحنات بالجملة',
        'createShipmentForClient': 'إنشاء شحنة للعميل',
        'selectClient': 'اختر عميلاً...',
        'recipientName': 'اسم المستلم',
        'recipientPhone': 'هاتف المستلم',
        'recipientAddress': 'عنوان المستلم',
        'zone': 'المنطقة',
        'packageDescription': 'وصف الطرد',
        'paymentMethod': 'طريقة الدفع',
        'priority': 'الأولوية',
        'packageValue': 'قيمة الطرد',
        'phoneValidation': 'يجب أن يكون 11 رقماً بالضبط (01000909899)',
        'downloadTemplate': 'تحميل النموذج',
        'uploadFile': 'رفع ملف',

        // Profile
        'myProfile': 'ملفي الشخصي',
        'viewEditPersonalInfo': 'عرض وتعديل معلوماتك الشخصية والعنوان الافتراضي.',
        'editProfile': 'تعديل الملف الشخصي',
        'personalInformation': 'المعلومات الشخصية',
        'fullName': 'الاسم الكامل',
        'emailAddress': 'عنوان البريد الإلكتروني',
        'phoneNumber': 'رقم الهاتف',
        'phoneExample': 'مثال للرقم المصري: 01012345678',
        'role': 'الدور',
        'notSet': 'غير محدد',
        'saveChanges': 'حفظ التغييرات',
        'profile.subtitle': 'عرض وتعديل معلوماتك الشخصية والعنوان الافتراضي.',
        'profile.editProfile': 'تعديل الملف الشخصي',
        'profile.personalInfo': 'المعلومات الشخصية',
        'profile.defaultAddress': 'عنوان الاستلام الافتراضي',
        'profile.name': 'الاسم',
        'profile.email': 'البريد الإلكتروني',
        'profile.phone': 'الهاتف',
        'profile.street': 'الشارع',
        'profile.city': 'المدينة',
        'profile.details': 'التفاصيل',

        // Wallet
        'wallet.title': 'محفظتي',
        'wallet.balance': 'الرصيد الحالي',
        'wallet.transactions': 'المعاملات',
        'wallet.requestPayout': 'طلب سحب',
        'wallet.availableBalance': 'الرصيد المتاح',
        'wallet.pendingPayouts': 'المدفوعات المعلقة',
        'wallet.transactionHistory': 'تاريخ المعاملات',
        'wallet.amount': 'المبلغ',
        'wallet.date': 'التاريخ',
        'wallet.type': 'النوع',
        'wallet.status': 'الحالة',

        // Dashboard screens
        'dashboard.welcomeBack': 'مرحباً بعودتك',
        'dashboard.quickStats': 'إحصائيات سريعة',
        'dashboard.recentActivity': 'النشاط الأخير',
        'dashboard.totalRevenue': 'إجمالي الإيرادات',
        'dashboard.activeShipments': 'الشحنات النشطة',
        'dashboard.completedToday': 'مكتملة اليوم',

        // Client Revenue
        'clientRevenue.title': 'إيرادات العميل',
        'clientRevenue.totalEarnings': 'إجمالي الأرباح',
        'clientRevenue.monthlyBreakdown': 'التفصيل الشهري',
        'clientRevenue.revenueAnalysis': 'تحليل الإيرادات',

        // Courier views
        'myTasks.title': 'مهامي',
        'myTasks.assignedToday': 'المكلف بها اليوم',
        'myTasks.pending': 'المهام المعلقة',
        'myTasks.inProgress': 'قيد التنفيذ',
        'completedOrders.title': 'الطلبات المكتملة',
        'completedOrders.today': 'اليوم',
        'completedOrders.thisWeek': 'هذا الأسبوع',
        'completedOrders.thisMonth': 'هذا الشهر',
        'myEarnings.title': 'أرباحي',
        'myEarnings.totalEarnings': 'إجمالي الأرباح',
        'myEarnings.commissionRate': 'معدل العمولة',

        // Management views
        'deliveredShipments.title': 'الشحنات المسلمة',
        'couriersByZone.title': 'المناديب حسب المنطقة',
        'myAssets.title': 'أصولي',
        'allShipments.title': 'جميع الشحنات',
        'packagingAssignment.title': 'التعبئة والتوزيع',
        'deliveryManagement.title': 'إدارة التسليم',
        'userManagement.title': 'إدارة المستخدمين',
        'roleManagement.title': 'إدارة الأدوار',
        'partnerTiers.title': 'مستويات الشراكة',
        'inventory.title': 'المخزون',
        'assetManagement.title': 'إدارة الأصول',
        'supplierManagement.title': 'إدارة الموردين',
        'courierPerformance.title': 'أداء المناديب',
        'adminFinancials.title': 'الماليات الإدارية',
        'totalShipments.title': 'إجمالي الشحنات',
        'notificationsLog.title': 'سجل الإشعارات',

        // Common table headers
        'table.id': 'المعرف',
        'table.name': 'الاسم',
        'table.email': 'البريد الإلكتروني',
        'table.phone': 'الهاتف',
        'table.address': 'العنوان',
        'table.city': 'المدينة',
        'table.zone': 'المنطقة',
        'table.status': 'الحالة',
        'table.date': 'التاريخ',
        'table.amount': 'المبلغ',
        'table.actions': 'الإجراءات',
        'table.view': 'عرض',
        'table.edit': 'تعديل',
        'table.delete': 'حذف',

        // Form fields
        'form.street': 'عنوان الشارع',
        'form.city': 'المدينة',
        'form.zone': 'المنطقة',
        'form.details': 'تفاصيل إضافية',
        'form.description': 'الوصف',
        'form.value': 'القيمة',
        'form.priority': 'الأولوية',
        'form.required': 'مطلوب',
        'form.optional': 'اختياري',

        // Client Analytics
        'clientAnalytics.title': 'تحليلات العملاء',
        'clientAnalytics.client': 'العميل',
        'clientAnalytics.totalShipments': 'إجمالي الشحنات',
        'clientAnalytics.walletBalance': 'رصيد المحفظة',
        'clientAnalytics.partnerTier': 'مستوى الشراكة',
        'clientAnalytics.flatRate': 'السعر الثابت',
        'clientAnalytics.pendingPayouts': 'المدفوعات المعلقة',
        'clientAnalytics.actions': 'الإجراءات',
        'clientAnalytics.viewShipments': 'عرض الشحنات',

        // Status
        'status.pending': 'في الانتظار',
        'status.assigned': 'مسند',
        'status.pickedUp': 'تم الاستلام',
        'status.inTransit': 'في الطريق',
        'status.outForDelivery': 'خارج للتسليم',
        'status.delivered': 'تم التسليم',
        'status.deliveryFailed': 'فشل التسليم',
        'status.returned': 'مرتجع',

        // Payment Methods
        'payment.cod': 'الدفع عند الاستلام',
        'payment.transfer': 'تحويل',
        'payment.wallet': 'المحفظة',

        // Priority
        'priority.standard': 'عادي',
        'priority.urgent': 'عاجل',
        'priority.express': 'سريع',
    }
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(() => 
        getFromStorage('app-language', 'en') as Language
    );

    useEffect(() => {
        // Set language attribute but do NOT change text direction - keep LTR for both languages
        document.documentElement.setAttribute('dir', 'ltr');
        document.documentElement.setAttribute('lang', language);
    }, [language]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        saveToStorage('app-language', lang);
    };

    const t = (key: string): string => {
        return translations[language][key as keyof typeof translations['en']] || key;
    };

    const direction = language === 'ar' ? 'rtl' : 'ltr';

    // Apply direction to document
    useEffect(() => {
        document.documentElement.dir = direction;
        document.documentElement.lang = language;
    }, [direction, language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, direction }}>
            {children}
        </LanguageContext.Provider>
    );
};
