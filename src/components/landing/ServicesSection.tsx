import React, { useState, useEffect, useRef } from 'react';
import { PackageCheck, Truck, Shield, Clock, Star, Users } from 'lucide-react';
import StarBorder from '../common/StarBorder';

interface ServicesSectionProps {
  t: (key: string) => string;
}

const ServicesSection: React.FC<ServicesSectionProps> = ({ t }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  const services = [
    {
      id: 'professional',
      title: t('service1Title'),
      description: t('service1Desc'),
      icon: <PackageCheck className="h-8 w-8" />,
      features: [t('service1Feature1'), t('service1Feature2'), t('service1Feature3'), t('service1Feature4')]
    },
    {
      id: 'fast',
      title: t('service2Title'),
      description: t('service2Desc'),
      icon: <Truck className="h-8 w-8" />,
      features: [t('service2Feature1'), t('service2Feature2'), t('service2Feature3'), t('service2Feature4')]
    },
    {
      id: 'reliable',
      title: t('service3Title'),
      description: t('service3Desc'),
      icon: <Shield className="h-8 w-8" />,
      features: [t('service3Feature1'), t('service3Feature2'), t('service3Feature3'), t('service3Feature4')]
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
      setActiveTab((prev) => (prev + 1) % services.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [services.length]);

  return (
      <section ref={sectionRef} id="services" className="services-bg py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`will-animate text-4xl font-bold text-white mb-6 ${isVisible ? 'slide-in-visible' : ''}`}>
              {t('servicesTitle')}
            </h2>
            <p className={`will-animate text-xl text-gray-300 max-w-3xl mx-auto ${isVisible ? 'slide-in-visible' : ''}`} style={{ animationDelay: '7.2s' }}>
              {t('servicesSubtitle')}
            </p>
          </div>
          
          <div className="max-w-6xl mx-auto">
            {/* Service Tabs */}
            <div className="flex flex-col md:flex-row justify-center mb-12 space-y-4 md:space-y-0 md:space-x-4">
              {services.map((service, index) => (
                <StarBorder
                  key={service.id}
                  as="button"
                  className={`service-tab w-full md:w-auto will-animate ${isVisible ? 'slide-in-visible' : ''}`}
                  style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                  onClick={() => setActiveTab(index)}
                  color={activeTab === index ? "#FFD000" : "cyan"}
                  speed={activeTab === index ? "3s" : "5s"}
                  innerClassName={`p-6 text-left ${
                    activeTab === index
                      ? 'active bg-white text-[#061A40] shadow-2xl'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`floating-icon ${activeTab === index ? 'text-[#061A40]' : 'text-[#FFD000]'}`}>
                      {service.icon}
                    </div>
                    <h3 className="text-lg font-semibold">{service.title}</h3>
                  </div>
                  <p className={`text-sm ${activeTab === index ? 'text-[#061A40]/80' : 'text-gray-300'}`}>
                    {service.description.substring(0, 60)}...
                  </p>
                </StarBorder>
              ))}
            </div>
            
            {/* Active Service Content */}
            <div className="service-content bg-white rounded-2xl p-8 md:p-12 shadow-2xl">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="p-3 bg-[#FFD000] rounded-xl text-[#061A40]">
                      {services[activeTab].icon}
                    </div>
                    <h3 className="text-3xl font-bold text-[#061A40]">
                      {services[activeTab].title}
                    </h3>
                  </div>
                  <p className="text-lg text-gray-700 mb-8">
                    {services[activeTab].description}
                  </p>
                  <div className="space-y-4">
                    {services[activeTab].features.map((feature, index) => (
                      <div key={index} className="feature-item flex items-center space-x-3">
                        <div className="w-2 h-2 bg-[#FFD000] rounded-full"></div>
                        <span className="text-[#061A40] font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="relative">
                  <div className="bg-gradient-to-r from-[#061A40] to-[#0A2F6B] rounded-2xl p-8 text-white">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="text-center">
                        <Star className="h-12 w-12 mx-auto text-[#FFD000] mb-4" />
                        <div className="text-2xl font-bold">4.9/5</div>
                        <div className="text-sm text-gray-300">Customer Rating</div>
                      </div>
                      <div className="text-center">
                        <Users className="h-12 w-12 mx-auto text-[#FFD000] mb-4" />
                        <div className="text-2xl font-bold">1000+</div>
                        <div className="text-sm text-gray-300">Happy Clients</div>
                      </div>
                      <div className="text-center">
                        <Clock className="h-12 w-12 mx-auto text-[#FFD000] mb-4" />
                        <div className="text-2xl font-bold">99.9%</div>
                        <div className="text-sm text-gray-300">On-Time Delivery</div>
                      </div>
                      <div className="text-center">
                        <Shield className="h-12 w-12 mx-auto text-[#FFD000] mb-4" />
                        <div className="text-2xl font-bold">100%</div>
                        <div className="text-sm text-gray-300">Secure Handling</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
  );
};

export default ServicesSection;