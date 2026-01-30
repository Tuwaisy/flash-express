import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  PackageIcon as Package, 
  MapPinIcon as MapPin, 
  ClockIcon as Clock, 
  CheckCircleIcon as CheckCircle, 
  XCircleIcon as AlertCircle, 
  PhoneIcon as Phone, 
  MailIcon as Mail,
  ReplyIcon as ArrowLeft,
  ReplyIcon as ExternalLink
} from '../components/Icons';
import translations from '../utils/translations';

interface Shipment {
  id: string;
  status: string;
  recipientName: string;
  recipientPhone: string;
  fromAddress: any;
  toAddress: any;
  createdAt: string;
  deliveredAt?: string;
  courierName?: string;
  priority: string;
  estimatedDelivery?: string;
}

const TrackShipment: React.FC = () => {
  const { shipmentId } = useParams<{ shipmentId: string }>();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState<'en' | 'ar'>('ar'); // Default to Arabic

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  useEffect(() => {
    document.body.className = 'tracking-page';
    if (language === 'ar') {
      document.body.classList.add('lang-ar');
      document.documentElement.dir = 'rtl';
    } else {
      document.body.classList.remove('lang-ar');
      document.documentElement.dir = 'ltr';
    }

    return () => {
      document.body.className = '';
      document.documentElement.dir = 'ltr';
    };
  }, [language]);

  useEffect(() => {
    if (shipmentId) {
      fetchShipment(shipmentId);
    }
  }, [shipmentId]);

  const fetchShipment = async (id: string) => {
    try {
      const response = await fetch(`/api/track/${id}`);
      if (response.ok) {
        const data = await response.json();
        setShipment(data);
      } else {
        setError(language === 'ar' ? 'لم يتم العثور على الشحنة' : 'Shipment not found');
      }
    } catch (error) {
      setError(language === 'ar' ? 'فشل في تحميل تفاصيل الشحنة' : 'Failed to load shipment details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered': return 'text-green-600 bg-green-100';
      case 'Out for Delivery': return 'text-blue-600 bg-blue-100';
      case 'Delivery Failed': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Delivered': return <CheckCircle className="h-6 w-6" />;
      case 'Delivery Failed': return <AlertCircle className="h-6 w-6" />;
      default: return <Package className="h-6 w-6" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: { ar: string; en: string } } = {
      'Waiting for Packaging': { ar: 'في انتظار التعبئة', en: 'Waiting for Packaging' },
      'Packaged and Waiting for Assignment': { ar: 'تم التعبئة وفي انتظار التعيين', en: 'Packaged and Waiting for Assignment' },
      'Assigned to Courier': { ar: 'تم التعيين للمندوب', en: 'Assigned to Courier' },
      'Out for Delivery': { ar: 'خارج للتوصيل', en: 'Out for Delivery' },
      'Delivered': { ar: 'تم التسليم', en: 'Delivered' },
      'Delivery Failed': { ar: 'فشل التسليم', en: 'Delivery Failed' }
    };
    return statusMap[status]?.[language] || status;
  };

  const getEstimatedDelivery = (priority: string) => {
    if (language === 'ar') {
      switch (priority?.toLowerCase()) {
        case 'express':
          return 'خلال 24 ساعة';
        case 'urgent':
          return 'خلال 48 ساعة';
        case 'standard':
        default:
          return 'خلال 3 أيام';
      }
    } else {
      switch (priority?.toLowerCase()) {
        case 'express':
          return 'Within 24 hours';
        case 'urgent':
          return 'Within 48 hours';
        case 'standard':
        default:
          return 'Within 3 days';
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#061A40]"></div>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {language === 'ar' ? 'لم يتم العثور على الشحنة' : 'Shipment Not Found'}
          </h2>
          <p className="text-gray-600 mb-4">
            {error || (language === 'ar' ? 'رقم الشحنة المدخل غير موجود.' : 'The shipment ID you entered does not exist.')}
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-[#061A40] text-white px-6 py-2 rounded-lg hover:bg-[#0a2454] transition-colors"
          >
            {language === 'ar' ? 'العودة للرئيسية' : 'Go Home'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-white ${language === 'ar' ? 'font-arabic' : 'font-sans'}`}>
      {/* Header */}
      <nav className="bg-white shadow-lg border-b-2 border-[#FFD000]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <button
                onClick={() => navigate('/')}
                className="flex items-center text-gray-700 hover:text-[#061A40] transition-colors font-medium"
              >
                <ArrowLeft className={`h-5 w-5 ${language === 'ar' ? 'ml-2 rotate-180' : 'mr-2'} flex-shrink-0`} />
                <span className="whitespace-nowrap">{language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</span>
              </button>
              <div className="w-px h-8 bg-gray-300"></div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <img src="/shuhna-logo-main.png" alt="Shuhna Express Logo" className="h-10 w-auto" />
                <span className="text-lg font-bold text-[#061A40]">شحنة إكسبرس</span>
              </div>
            </div>
            <button
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="px-4 py-2 rounded-lg border-2 border-[#FFD000] text-[#061A40] bg-[#FFD000] hover:bg-[#061A40] hover:text-white transition-all font-medium"
            >
              {language === 'en' ? 'عربي' : 'EN'}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Tracking Header */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-[#061A40] mb-2">
                {language === 'ar' ? 'تتبع الشحنة' : 'Track Your Shipment'}
              </h1>
              <p className="text-lg font-medium text-gray-700">
                {language === 'ar' ? 'رقم الشحنة:' : 'Shipment ID:'} 
                <span className="text-[#061A40] font-bold ml-1">{shipment.id}</span>
              </p>
            </div>
            <div className="text-right rtl:text-left">
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-base font-bold shadow-md ${getStatusColor(shipment.status)}`}>
                <span className={`flex-shrink-0 ${language === 'ar' ? 'ml-2' : 'mr-2'}`}>
                  {getStatusIcon(shipment.status)}
                </span>
                <span className="whitespace-nowrap">{getStatusText(shipment.status)}</span>
              </div>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="text-center">
              <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center shadow-lg ${
                ['Waiting for Packaging', 'Packaged and Waiting for Assignment', 'Assigned to Courier', 'Out for Delivery', 'Delivered'].includes(shipment.status)
                ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                <Package className="h-6 w-6" />
              </div>
              <p className="text-base font-semibold text-gray-800">
                {language === 'ar' ? 'تمت المعالجة' : 'Processed'}
              </p>
            </div>
            <div className="text-center">
              <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center shadow-lg ${
                ['Out for Delivery', 'Delivered'].includes(shipment.status)
                ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                <MapPin className="h-6 w-6" />
              </div>
              <p className="text-base font-semibold text-gray-800">
                {language === 'ar' ? 'خارج للتوصيل' : 'Out for Delivery'}
              </p>
            </div>
            <div className="text-center">
              <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center shadow-lg ${
                shipment.status === 'Delivered' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                <CheckCircle className="h-6 w-6" />
              </div>
              <p className="text-base font-semibold text-gray-800">
                {language === 'ar' ? 'تم التسليم' : 'Delivered'}
              </p>
            </div>
          </div>
        </div>

        {/* Shipment Details */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Delivery Information */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-[#061A40] mb-6">
              {language === 'ar' ? 'معلومات التسليم' : 'Delivery Information'}
            </h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className={`flex-shrink-0 ${language === 'ar' ? 'ml-4' : 'mr-4'} mt-1`}>
                  <Clock className="h-6 w-6 text-[#061A40]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {language === 'ar' ? 'التسليم المتوقع' : 'Estimated Delivery'}
                  </p>
                  <p className="font-bold text-lg text-gray-900">{getEstimatedDelivery(shipment.priority)}</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className={`flex-shrink-0 ${language === 'ar' ? 'ml-4' : 'mr-4'} mt-1`}>
                  <MapPin className="h-6 w-6 text-[#061A40]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {language === 'ar' ? 'المستلم' : 'Recipient'}
                  </p>
                  <p className="font-bold text-lg text-gray-900">{shipment.recipientName}</p>
                </div>
              </div>
              {shipment.courierName && (
                <div className="flex items-start">
                  <div className={`flex-shrink-0 ${language === 'ar' ? 'ml-4' : 'mr-4'} mt-1`}>
                    <Package className="h-6 w-6 text-[#061A40]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {language === 'ar' ? 'المندوب' : 'Courier'}
                    </p>
                    <p className="font-bold text-lg text-gray-900">{shipment.courierName}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact & Support */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-[#061A40] mb-6">
              {language === 'ar' ? 'تحتاج مساعدة؟' : 'Need Help?'}
            </h2>
            <div className="space-y-4">
              <p className="text-gray-700 text-base font-medium">
                {language === 'ar' 
                  ? 'إذا كان لديك أي أسئلة حول شحنتك، لا تتردد في الاتصال بنا.'
                  : 'If you have any questions about your shipment, feel free to contact us.'
                }
              </p>
              <div className="space-y-3">
                <a
                  href="tel:+201032674447"
                  className="flex items-center text-[#061A40] hover:text-[#FFD000] hover:bg-[#061A40] p-3 rounded-lg transition-all border border-gray-200 hover:border-[#061A40] font-medium"
                >
                  <div className={`flex-shrink-0 ${language === 'ar' ? 'ml-3' : 'mr-3'}`}>
                    <Phone className="h-5 w-5" />
                  </div>
                  <span>+201032674447</span>
                </a>
                <a
                  href="mailto:info@shuhna.net"
                  className="flex items-center text-[#061A40] hover:text-[#FFD000] hover:bg-[#061A40] p-3 rounded-lg transition-all border border-gray-200 hover:border-[#061A40] font-medium"
                >
                  <div className={`flex-shrink-0 ${language === 'ar' ? 'ml-3' : 'mr-3'}`}>
                    <Mail className="h-5 w-5" />
                  </div>
                  <span>info@shuhna.net</span>
                </a>
                <a
                  href={`https://wa.me/201032674447?text=${encodeURIComponent(
                    language === 'ar' 
                      ? `مرحباً، أحتاج مساعدة بخصوص شحنتي ${shipment.id}`
                      : `Hello, I need help with my shipment ${shipment.id}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-green-600 hover:text-white hover:bg-green-600 p-3 rounded-lg transition-all border border-green-200 hover:border-green-600 font-medium"
                >
                  <div className={`flex-shrink-0 ${language === 'ar' ? 'ml-3' : 'mr-3'}`}>
                    <ExternalLink className="h-5 w-5" />
                  </div>
                  <span>{language === 'ar' ? 'دعم واتساب' : 'WhatsApp Support'}</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Share Section */}
        <div className="mt-6 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-[#061A40] mb-4">
            {language === 'ar' ? 'مشاركة رابط التتبع' : 'Share Tracking Link'}
          </h3>
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <input
              type="text"
              readOnly
              value={window.location.href}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50 text-base font-medium text-gray-800 focus:border-[#FFD000] focus:outline-none"
            />
            <button
              onClick={() => navigator.clipboard.writeText(window.location.href)}
              className="px-6 py-3 bg-[#061A40] text-white rounded-lg hover:bg-[#FFD000] hover:text-[#061A40] transition-all font-bold text-base border-2 border-[#061A40] hover:border-[#FFD000]"
            >
              {language === 'ar' ? 'نسخ' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#061A40] text-white py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-3 rtl:space-x-reverse mb-4">
            <img src="/shuhna-logo-main.png" alt="Shuhna Express Logo" className="h-8 w-8" />
            <span className="text-lg font-semibold">شحنة إكسبرس</span>
          </div>
          <p className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} شحنة إكسبرس. {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All rights reserved.'}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default TrackShipment;
