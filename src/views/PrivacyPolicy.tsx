import React, { useState, useEffect } from 'react';
import { ArrowRight, Shield, Eye, Package, Users, Mail, Phone, Clock } from 'lucide-react';
import translations from '../utils/translations';

const PrivacyPolicy: React.FC = () => {
  const [language, setLanguage] = useState<'en' | 'ar'>('en');

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  useEffect(() => {
    document.body.className = 'landing-page-active';
    if (language === 'ar') {
      document.body.classList.add('lang-ar');
      document.documentElement.dir = 'rtl';
    } else {
      document.body.classList.remove('lang-ar');
      document.documentElement.dir = 'ltr';
    }

    return () => {
      document.body.className = '';
      document.documentElement.dir = '';
    };
  }, [language]);

  const goBack = () => {
    window.history.back();
  };

  const currentDate = new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="bg-[#061A40] min-h-screen">
      {/* Header */}
      <nav className="header-blur shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo and Back Button */}
            <div className="flex items-center space-x-4">
              <button 
                onClick={goBack}
                className="flex items-center text-white hover:text-[#FFD000] transition-all duration-300 bg-white/10 hover:bg-[#FFD000]/20 px-4 py-2 rounded-lg"
              >
                <ArrowRight className="h-5 w-5 mr-2 transform rotate-180" />
                {t('privacyGoBack')}
              </button>
              <div className="w-px h-8 bg-white/20"></div>
              <img src="/shuhna-logo-main.png" alt="Shuhna Express Logo" className="h-12 w-auto" />
            </div>

            {/* Language Toggle */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="px-4 py-2 rounded-lg border border-[#FFD000] text-[#FFD000] hover:bg-[#FFD000] hover:text-[#061A40] transition-all duration-300 font-medium"
            >
              {language === 'en' ? 'AR' : 'EN'}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-[#FFD000] rounded-full mb-6">
              <Shield className="h-10 w-10 text-[#061A40]" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {t('privacyTitle')}
            </h1>
            <p className="text-xl text-gray-300 mb-2">
              {t('privacySubtitle')}
            </p>
            <p className="text-sm text-gray-400">
              {t('privacyLastUpdated')}: {currentDate}
            </p>
          </div>

          {/* Privacy Policy Content */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
            {/* Introduction */}
            <section className="mb-10">
              <div className="flex items-center mb-4">
                <Eye className="h-6 w-6 text-[#FFD000] mr-3" />
                <h2 className="text-2xl font-bold text-[#061A40]">{t('privacyIntroTitle')}</h2>
              </div>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t('privacyIntroText1')}
              </p>
              <p className="text-gray-700 leading-relaxed">
                {t('privacyIntroText2')}
              </p>
            </section>

            {/* Information We Collect */}
            <section className="mb-10">
              <div className="flex items-center mb-4">
                <Package className="h-6 w-6 text-[#FFD000] mr-3" />
                <h2 className="text-2xl font-bold text-[#061A40]">{t('privacyCollectTitle')}</h2>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-[#061A40] mb-2">{t('privacyPersonalInfo')}</h3>
                  <ul className="text-gray-700 space-y-1 ml-4">
                    <li>• {t('privacyPersonalInfo1')}</li>
                    <li>• {t('privacyPersonalInfo2')}</li>
                    <li>• {t('privacyPersonalInfo3')}</li>
                    <li>• {t('privacyPersonalInfo4')}</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-[#061A40] mb-2">{t('privacyShipmentInfo')}</h3>
                  <ul className="text-gray-700 space-y-1 ml-4">
                    <li>• {t('privacyShipmentInfo1')}</li>
                    <li>• {t('privacyShipmentInfo2')}</li>
                    <li>• {t('privacyShipmentInfo3')}</li>
                    <li>• {t('privacyShipmentInfo4')}</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-[#061A40] mb-2">{t('privacyTechnicalInfo')}</h3>
                  <ul className="text-gray-700 space-y-1 ml-4">
                    <li>• {t('privacyTechnicalInfo1')}</li>
                    <li>• {t('privacyTechnicalInfo2')}</li>
                    <li>• {t('privacyTechnicalInfo3')}</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* How We Use Information */}
            <section className="mb-10">
              <div className="flex items-center mb-4">
                <Users className="h-6 w-6 text-[#FFD000] mr-3" />
                <h2 className="text-2xl font-bold text-[#061A40]">{t('privacyUseTitle')}</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-[#061A40] mb-2">{t('privacyServiceDelivery')}</h3>
                  <ul className="text-gray-700 space-y-1 text-sm">
                    <li>• {t('privacyServiceDelivery1')}</li>
                    <li>• {t('privacyServiceDelivery2')}</li>
                    <li>• {t('privacyServiceDelivery3')}</li>
                  </ul>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-[#061A40] mb-2">{t('privacyCommunication')}</h3>
                  <ul className="text-gray-700 space-y-1 text-sm">
                    <li>• {t('privacyCommunication1')}</li>
                    <li>• {t('privacyCommunication2')}</li>
                    <li>• {t('privacyCommunication3')}</li>
                  </ul>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-[#061A40] mb-2">{t('privacyImprovement')}</h3>
                  <ul className="text-gray-700 space-y-1 text-sm">
                    <li>• {t('privacyImprovement1')}</li>
                    <li>• {t('privacyImprovement2')}</li>
                    <li>• {t('privacyImprovement3')}</li>
                  </ul>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-[#061A40] mb-2">{t('privacyLegal')}</h3>
                  <ul className="text-gray-700 space-y-1 text-sm">
                    <li>• {t('privacyLegal1')}</li>
                    <li>• {t('privacyLegal2')}</li>
                    <li>• {t('privacyLegal3')}</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Data Protection */}
            <section className="mb-10">
              <div className="flex items-center mb-4">
                <Shield className="h-6 w-6 text-[#FFD000] mr-3" />
                <h2 className="text-2xl font-bold text-[#061A40]">{t('privacyProtectionTitle')}</h2>
              </div>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t('privacyProtectionText1')}
              </p>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Shield className="h-8 w-8 text-[#FFD000] mx-auto mb-2" />
                  <h3 className="font-semibold text-[#061A40] mb-1">{t('privacyEncryption')}</h3>
                  <p className="text-gray-600 text-sm">{t('privacyEncryptionDesc')}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Users className="h-8 w-8 text-[#FFD000] mx-auto mb-2" />
                  <h3 className="font-semibold text-[#061A40] mb-1">{t('privacyAccess')}</h3>
                  <p className="text-gray-600 text-sm">{t('privacyAccessDesc')}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Package className="h-8 w-8 text-[#FFD000] mx-auto mb-2" />
                  <h3 className="font-semibold text-[#061A40] mb-1">{t('privacyStorage')}</h3>
                  <p className="text-gray-600 text-sm">{t('privacyStorageDesc')}</p>
                </div>
              </div>
            </section>

            {/* Your Rights */}
            <section className="mb-10">
              <div className="flex items-center mb-4">
                <Users className="h-6 w-6 text-[#FFD000] mr-3" />
                <h2 className="text-2xl font-bold text-[#061A40]">{t('privacyRightsTitle')}</h2>
              </div>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t('privacyRightsText')}
              </p>
              <div className="space-y-2">
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-[#FFD000] rounded-full mr-3"></div>
                  <span className="text-gray-700">{t('privacyRight1')}</span>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-[#FFD000] rounded-full mr-3"></div>
                  <span className="text-gray-700">{t('privacyRight2')}</span>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-[#FFD000] rounded-full mr-3"></div>
                  <span className="text-gray-700">{t('privacyRight3')}</span>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-[#FFD000] rounded-full mr-3"></div>
                  <span className="text-gray-700">{t('privacyRight4')}</span>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-[#FFD000] rounded-full mr-3"></div>
                  <span className="text-gray-700">{t('privacyRight5')}</span>
                </div>
              </div>
            </section>

            {/* Contact Information */}
            <section className="mb-8">
              <div className="flex items-center mb-4">
                <Mail className="h-6 w-6 text-[#FFD000] mr-3" />
                <h2 className="text-2xl font-bold text-[#061A40]">{t('privacyContactTitle')}</h2>
              </div>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t('privacyContactText')}
              </p>
              <div className="bg-[#061A40] text-white p-6 rounded-lg">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-[#FFD000]" />
                    <div>
                      <p className="font-semibold">{t('privacyEmail')}</p>
                      <p className="text-gray-300">info@shuhna.net</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-[#FFD000]" />
                    <div>
                      <p className="font-semibold">{t('privacyPhone')}</p>
                      <p className="text-gray-300">+201032674447</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Updates to Policy */}
            <section className="border-t border-gray-200 pt-8">
              <h2 className="text-xl font-bold text-[#061A40] mb-4">{t('privacyUpdatesTitle')}</h2>
              <p className="text-gray-700 leading-relaxed">
                {t('privacyUpdatesText')}
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer-bg text-white py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <img src="/shuhna-logo-main.png" alt="Shuhna Express Logo" className="h-8 w-8" />
            <span className="text-lg font-semibold">Shuhna Express</span>
          </div>
          <p className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} Shuhna Express. {t('footerRights')}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
