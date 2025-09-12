// src/types.ts

// --- ENUMS ---

export enum UserRole {
    ADMIN = 'Administrator',
    SUPER_USER = 'Super User',
    CLIENT = 'Client',
    COURIER = 'Courier',
    ASSIGNING_USER = 'Assigning User'
}

export enum ShipmentStatus {
    WAITING_FOR_PACKAGING = 'Waiting for Packaging',
    PACKAGED_AND_WAITING_FOR_ASSIGNMENT = 'Packaged and Waiting for Assignment',
    ASSIGNED_TO_COURIER = 'Assigned to Courier',
    OUT_FOR_DELIVERY = 'Out for Delivery',
    DELIVERED = 'Delivered',
    DELIVERY_FAILED = 'Delivery Failed',
}

export enum PaymentMethod {
    COD = 'COD',
    WALLET = 'Wallet',
    TRANSFER = 'Transfer',
}

export enum ShipmentPriority {
    STANDARD = 'Standard',
    URGENT = 'Urgent',
    EXPRESS = 'Express',
}

export enum CommissionType {
    FLAT = 'flat',
    PERCENTAGE = 'percentage',
}

export enum CourierTransactionType {
    COMMISSION = 'Commission',
    PENALTY = 'Penalty',
    BONUS = 'Bonus',
    WITHDRAWAL_REQUEST = 'Withdrawal Request',
    WITHDRAWAL_PROCESSED = 'Withdrawal Processed',
    WITHDRAWAL_DECLINED = 'Withdrawal Declined',
    REFERRAL_BONUS = 'Referral Bonus',
}

export enum CourierTransactionStatus {
    PENDING = 'Pending',
    PROCESSED = 'Processed',
    FAILED = 'Failed',
}

export enum TransactionType {
    DEPOSIT = 'Deposit',
    PAYMENT = 'Payment',
    WITHDRAWAL_REQUEST = 'Withdrawal Request',
    WITHDRAWAL_PROCESSED = 'Withdrawal Processed',
}

export type ClientTransactionStatus = 'Pending' | 'Processed' | 'Failed';


export enum NotificationChannel {
    EMAIL = 'Email',
    SMS = 'SMS',
    SYSTEM = 'System',
}

export enum AssetType {
    VEHICLE = 'Vehicle',
    DEVICE = 'Device',
    EQUIPMENT = 'Equipment',
    OTHER = 'Other',
}

export enum AssetStatus {
    AVAILABLE = 'Available',
    ASSIGNED = 'Assigned',
    IN_REPAIR = 'In Repair',
    RETIRED = 'Retired',
}

export enum PartnerTier {
    BRONZE = 'Bronze',
    SILVER = 'Silver',
    GOLD = 'Gold',
}

// --- INTERFACES & TYPES ---

export type Address = {
    street: string;
    city: string;
    zone: string;
    details?: string;
};

export type PackagingLogEntry = {
    inventoryItemId: string;
    itemName: string;
    quantityUsed: number;
};

export type StatusHistoryEntry = {
    status: ShipmentStatus | string; // Allow for legacy or custom statuses
    timestamp: string;
};


export type Shipment = {
    id: string;
    clientId: number;
    clientName: string;
    recipientName: string;
    recipientPhone: string;
    fromAddress: Address;
    toAddress: Address;
    packageDescription: string;
    isLargeOrder: boolean;
    price: number;
    paymentMethod: PaymentMethod;
    status: ShipmentStatus;
    courierId?: number;
    creationDate: string;
    deliveryDate?: string;
    priority: ShipmentPriority;
    packageValue: number;
    clientFlatRateFee?: number;
    courierCommission?: number;
    failureReason?: string;
    failurePhotoPath?: string;
    packagingNotes?: string;
    packagingLog?: PackagingLogEntry[];
    statusHistory?: StatusHistoryEntry[];
    amountReceived?: number;
    amountToCollect?: number;
};

export type User = {
    id: number;
    publicId: string;
    name: string;
    email: string;
    password?: string;
    roles: UserRole[] | string[];
    phone?: string;
    address?: Address;
    zones?: string[];
    flatRateFee?: number;
    taxCardNumber?: string;
    priorityMultipliers?: {
        [ShipmentPriority.STANDARD]: number;
        [ShipmentPriority.URGENT]: number;
        [ShipmentPriority.EXPRESS]: number;
    };
    walletBalance?: number; // Calculated on frontend
    permissions?: Permission[]; // Calculated on frontend
    location?: { lat: number; lng: number };
    referrerId?: number;
    referralCommission?: number;
    partnerTier?: PartnerTier;
    manualTierAssignment?: boolean;
};

export type ClientTransaction = {
    id: string;
    userId: number;
    type: TransactionType;
    amount: number;
    date: string;
    description: string;
    status?: ClientTransactionStatus;
};

export type CourierStats = {
    courierId: number;
    commissionType: CommissionType;
    commissionValue: number;
    consecutiveFailures: number;
    isRestricted: boolean;
    restrictionReason?: string;
    performanceRating: number;
    // Calculated on frontend
    totalEarnings: number;
    currentBalance: number;
    pendingEarnings: number;
    deliveriesCompleted: number;
    deliveriesFailed: number;
};

export type CourierTransaction = {
    id: string;
    courierId: number;
    type: CourierTransactionType;
    amount: number;
    description?: string;
    shipmentId?: string;
    timestamp: string;
    status: CourierTransactionStatus;
    paymentMethod?: 'Cash' | 'Bank Transfer';
    transferEvidencePath?: string;
};

export type Notification = {
    id: string;
    shipmentId: string;
    channel: NotificationChannel;
    recipient: string;
    message: string;
    date: string;
    status: ShipmentStatus;
    sent: boolean;
};

export type Toast = {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
    duration?: number;
};

export type FinancialSettings = {
    taxRate: number; // as percentage
    defaultCommission: number; // flat rate
};

export type AdminFinancials = {
    totalCollectedMoney: number;
    undeliveredPackagesValue: number;
    uncollectedTransferFees: number;
    totalOwedToCouriers: number;
    totalRevenue: number;
    totalFees: number;
    totalCommission: number;
    netRevenue: number;
    cashToCollect: number;
    totalCODCollected: number;
    totalOrders: number;
};

export type ClientFinancialSummary = {
    clientId: number;
    clientName: string;
    totalOrders: number;
    orderSum: number;
    flatRateFee: number;
    partnerTier?: PartnerTier;
    manualTierAssignment?: boolean;
};

export const Permission = {
    MANAGE_USERS: 'manage_users',
    EDIT_USER_PROFILE: 'edit_user_profile',
    MANAGE_ROLES: 'manage_roles',
    CREATE_SHIPMENTS: 'create_shipments',
    CREATE_SHIPMENTS_FOR_OTHERS: 'create_shipments_for_others',
    VIEW_OWN_SHIPMENTS: 'view_own_shipments',
    VIEW_ALL_SHIPMENTS: 'view_all_shipments',
    ASSIGN_SHIPMENTS: 'assign_shipments',
    VIEW_COURIER_TASKS: 'view_courier_tasks',
    UPDATE_SHIPMENT_STATUS: 'update_shipment_status',
    VIEW_OWN_WALLET: 'view_own_wallet',
    VIEW_OWN_FINANCIALS: 'view_own_financials',
    VIEW_CLIENT_REVENUE: 'view_client_revenue',
    VIEW_ADMIN_FINANCIALS: 'view_admin_financials',
    VIEW_CLIENT_ANALYTICS: 'view_client_analytics',
    VIEW_COURIER_PERFORMANCE: 'view_courier_performance',
    MANAGE_COURIER_PAYOUTS: 'manage_courier_payouts',
    VIEW_COURIER_EARNINGS: 'view_courier_earnings',
    VIEW_NOTIFICATIONS_LOG: 'view_notifications_log',
    VIEW_DASHBOARD: 'view_dashboard',
    VIEW_PROFILE: 'view_profile',
    VIEW_TOTAL_SHIPMENTS_OVERVIEW: 'view_total_shipments_overview',
    VIEW_COURIER_COMPLETED_ORDERS: 'view_courier_completed_orders',
    MANAGE_INVENTORY: 'manage_inventory',
    DELETE_INVENTORY_ITEM: 'delete_inventory_item',
    MANAGE_ASSETS: 'manage_assets',
    DELETE_ASSET: 'delete_asset',
    VIEW_OWN_ASSETS: 'view_own_assets',
    MANAGE_CLIENT_PAYOUTS: 'manage_client_payouts',
    MANAGE_SUPPLIERS: 'manage_suppliers',
    PRINT_LABELS: 'print_labels',
    VIEW_DELIVERED_SHIPMENTS: 'view_delivered_shipments',
    VIEW_COURIERS_BY_ZONE: 'view_couriers_by_zone',
    MANAGE_PARTNER_TIERS: 'manage_partner_tiers',
    EDIT_CLIENT_ADDRESS: 'edit_client_address',
    VIEW_ADMIN_DELIVERY_MANAGEMENT: 'view_admin_delivery_management'
} as const;

export type Permission = typeof Permission[keyof typeof Permission];


export type CustomRole = {
    id: string;
    name: string;
    permissions: Permission[];
    isSystemRole: boolean;
};

export type InventoryItem = {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    lastUpdated: string;
    minStock?: number;
    unitPrice?: number;
};

export type Asset = {
    id: string;
    type: AssetType;
    name: string;
    identifier?: string;
    status: AssetStatus;
    assignedToUserId?: number;
    assignmentDate?: string;
    purchaseDate?: string;
    purchasePrice?: number;
    usefulLifeMonths?: number;
};

export type Supplier = {
    id: string;
    name: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    address?: string;
};

export type SupplierTransaction = {
    id: string;
    supplier_id: string;
    date: string;
    description?: string;
    type: 'Payment' | 'Credit';
    amount: number;
};

export type InAppNotification = {
    id: string;
    userId: number;
    message: string;
    link?: string;
    isRead: boolean;
    timestamp: string;
};

export type TierSetting = {
    tierName: PartnerTier;
    shipmentThreshold: number;
    discountPercentage: number;
};


export const ZONES = {
  "GreaterCairo": {
    "Cairo": [
      "Nasr City",
      "Heliopolis",
      "New Cairo",
      "5th Settlement",
      "3rd Settlement",
      "1st Settlement",
      "Rehab City",
      "Madinty",
      "El Shorouk",
      "El Obour",
      "Maadi",
      "Zahraa El Maadi",
      "Katameya",
      "Mokattam",
      "Downtown Cairo",
      "Garden City",
      "Zamalek",
      "Shubra",
      "Abbassia",
      "Ain Shams",
      "El Marg",
      "Matariya",
      "Helwan",
      "15th of May City",
      "New Administrative Capital"
    ],
    "Giza": [
      "Mohandessin",
      "Dokki",
      "Agouza",
      "Haram",
      "Faisal",
      "Giza Square",
      "Imbaba",
      "Boulak El Dakrour",
      "Warraq",
      "6th of October City",
      "Sheikh Zayed",
      "Hadayek October",
      "Mansoureya",
      "Nazlet El Semman",
      "Maryoteya",
      "Bahariya Oasis Road"
    ]
  },
  "Alexandria": [
    "Alexandria - Raml Station",
    "Alexandria - Laurent",
    "Alexandria - Smouha",
    "Alexandria - Asafra",
  ],
  "Other": [
    "Other - Shibin El Kom",
    "Other - Port Said",
    "Other - Mansoura (University)",
    "Other - Mansoura (El Geish)",
    "Other - Tanta",
    "Other - Ismailia",
    "Other - Zagazig",
    "Other - Suez",
    "Other - Mahalla",
    "Other - Assiut",
    "Other - Marina",
    "Other - Hurghada",
  ]
};