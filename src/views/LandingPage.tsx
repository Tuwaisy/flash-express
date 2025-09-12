import React, { useState, useEffect } from 'react';
import translations from '../utils/translations';
import Header from '../components/landing/Header';
import Hero from '../components/landing/Hero';
import TrackingSection from '../components/landing/TrackingSection';
import ServicesSection from '../components/landing/ServicesSection';
import AboutSection from '../components/landing/AboutSection';
import PricingSection from '../components/landing/PricingSection';
import SubscriptionsSection from '../components/landing/SubscriptionsSection';
import TestimonialsSection from '../components/landing/TestimonialsSection';
import ContactSection from '../components/landing/ContactSection';
import Footer from '../components/landing/Footer';

const LandingPage: React.FC = () => {
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

  return (
    <div className="bg-[#061A40]">
      <Header currentLang={language} setLanguage={setLanguage} t={t} />
      <main>
        <Hero t={t} />
        <TrackingSection t={t} />
        <ServicesSection t={t} />
        <AboutSection t={t} />
        <PricingSection t={t} />
        <SubscriptionsSection t={t} />
        <TestimonialsSection t={t} />
        <ContactSection t={t} />
      </main>
      <Footer t={t} />
    </div>
  );
};

export default LandingPage;
