import React, { useState, useEffect, useRef } from 'react';
import { Box, PackagePlus, Crown, Zap } from 'lucide-react';

interface PricingSectionProps {
  t: (key: string) => string;
}

const PricingSection: React.FC<PricingSectionProps> = ({ t }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerHeight = 80;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - headerHeight;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const tiers = [
    {
      id: 'standard',
      title: t('smallOrdersTitle'),
      price: t('smallOrdersPrice'),
      description: t('smallOrdersDesc'),
      icon: <Box className="h-12 w-12" />,
      features: [
        t('standardFeature1'),
        t('standardFeature2'),
        t('standardFeature3'),
        t('standardFeature4'),
        t('standardFeature5')
      ],
      color: 'from-blue-500 to-blue-700',
      popular: false
    },
    {
      id: 'premium',
      title: t('premiumServiceTitle'),
      price: t('premiumServicePrice'),
      description: t('premiumServiceDesc'),
      icon: <Crown className="h-12 w-12" />,
      features: [
        t('premiumFeature1'),
        t('premiumFeature2'),
        t('premiumFeature3'),
        t('premiumFeature4'),
        t('premiumFeature5'),
        t('premiumFeature6')
      ],
      color: 'from-purple-500 to-purple-700',
      popular: true
    },
    {
      id: 'enterprise',
      title: t('largeOrdersTitle'),
      price: t('customPrice'),
      description: t('largeOrdersDesc'),
      icon: <PackagePlus className="h-12 w-12" />,
      features: [
        t('enterpriseFeature1'),
        t('enterpriseFeature2'),
        t('enterpriseFeature3'),
        t('enterpriseFeature4'),
        t('enterpriseFeature5'),
        t('enterpriseFeature6')
      ],
      color: 'from-green-500 to-green-700',
      popular: false
    }
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
        if (sectionRef.current) {
            observer.unobserve(sectionRef.current);
        }
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % tiers.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [tiers.length]);

  return (
      <section ref={sectionRef} id="pricing" className="pricing-bg py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`will-animate text-4xl font-bold text-white mb-6 ${isVisible ? 'slide-in-visible' : ''}`}>
              {t('pricingTitle')}
            </h2>
            <p className={`will-animate text-xl text-gray-300 max-w-3xl mx-auto ${isVisible ? 'slide-in-visible' : ''}`} style={{ animationDelay: '0.2s' }}>
              {t('pricingSubtitle')}
            </p>
          </div>
          
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {tiers.map((tier, index) => (
                <div
                  key={tier.id}
                  className={`tier-card flex flex-col bg-white rounded-2xl p-8 relative will-animate ${
                    activeTab === index ? 'active' : ''
                  } ${isVisible ? 'slide-in-visible' : ''}`}
                  style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                  onMouseEnter={() => setActiveTab(index)}
                >
                  {tier.popular && (
                    <div className="popular-badge absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <div className="bg-[#FFD000] text-[#061A40] px-6 py-2 rounded-full text-sm font-bold flex items-center">
                        <Zap className="h-4 w-4 mr-1" />
                        Most Popular
                      </div>
                    </div>
                  )}
                  
                  <div className="flex-grow">
                    <div className="text-center mb-8">
                      <div className={`p-4 rounded-xl bg-gradient-to-r ${tier.color} inline-block mb-4`}>
                        <div className="text-white">
                          {tier.icon}
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-[#061A40] mb-2">{tier.title}</h3>
                      <div className="text-4xl font-black price-highlight mb-2">{tier.price}</div>
                      <p className="text-gray-600">{tier.description}</p>
                    </div>
                    
                    <div className="space-y-4 mb-8">
                      {tier.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center space-x-3">
                          <div 
                            className="feature-check w-5 h-5 bg-[#FFD000] rounded-full flex items-center justify-center"
                            style={{ animationDelay: `${0.5 + featureIndex * 0.1}s` }}
                          >
                            <div className="w-2 h-2 bg-[#061A40] rounded-full"></div>
                          </div>
                          <span className="text-[#061A40] font-medium">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => scrollToSection('contact')}
                    className="w-full py-3 rounded-xl font-bold transition-all duration-300 mt-auto bg-[#FFD000] text-[#061A40] hover:bg-[#e6bb00]"
                  >
                    {tier.id === 'enterprise' ? t('largeOrdersCTA') : t('getStarted')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
  );
};

export default PricingSection;