import React, { useEffect, useState, useRef } from 'react';
import { Phone, MessageCircle, MapPin, Clock, Mail } from 'lucide-react';

interface ContactSectionProps {
  t: (key: string) => string;
}

const ContactSection: React.FC<ContactSectionProps> = ({ t }) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

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

  return (
      <section ref={sectionRef} id="contact" className="contact-bg py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`will-animate text-4xl font-bold text-[#061A40] mb-6 ${isVisible ? 'slide-in-visible' : ''}`}>
              {t('contactTitle')}
            </h2>
            <p className={`will-animate text-xl text-gray-600 max-w-3xl mx-auto ${isVisible ? 'slide-in-visible' : ''}`} style={{ animationDelay: '0.2s' }}>
              {t('contactSubtitle')}
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Main Contact Card */}
              <div className={`contact-card rounded-2xl p-8 text-center will-animate ${isVisible ? 'slide-in-visible' : ''}`} style={{ animationDelay: '0.4s' }}>
                <div className="phone-pulse mb-6">
                  <div className="p-4 bg-[#FFD000] rounded-full inline-block">
                    <Phone className="h-16 w-16 text-[#061A40]" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-[#061A40] mb-4">
                  {t('contactNumber')}
                </h3>
                
                <div className="text-3xl font-black text-[#061A40] mb-8 tracking-wider" dir="ltr">
                  +201032674447
                </div>
                
                <div className="space-y-4">
                  <a
                    href="tel:+201032674447"
                    className="contact-button w-full shadow-lg rounded-lg bg-[#061A40] text-white py-4 px-6 font-bold flex items-center justify-center space-x-3 hover:bg-[#0A2F6B] transition-colors duration-300"
                  >
                    <Phone className="h-5 w-5" />
                    <span>{t('contactCall')}</span>
                  </a>
                  
                  <a
                    href="https://wa.me/201032674447"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-button w-full shadow-lg rounded-lg bg-green-500 text-white py-4 px-6 font-bold flex items-center justify-center space-x-3 hover:bg-green-600 transition-colors duration-300"
                  >
                    <MessageCircle className="h-5 w-5" />
                    <span>{t('contactWhatsapp')}</span>
                  </a>
                </div>
              </div>
              
              {/* Business Info */}
              <div className="space-y-6">
                <div className={`info-card rounded-xl p-6 text-white will-animate ${isVisible ? 'slide-in-visible' : ''}`} style={{ animationDelay: '0.5s' }}>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="floating-icon">
                      <MapPin className="h-8 w-8 text-[#FFD000]" />
                    </div>
                    <h4 className="text-xl font-bold">{t('contactServiceAreaTitle')}</h4>
                  </div>
                  <p className="text-gray-300">{t('contactServiceAreaDesc')}</p>
                </div>
                
                <div className={`info-card rounded-xl p-6 text-white will-animate ${isVisible ? 'slide-in-visible' : ''}`} style={{ animationDelay: '0.6s' }}>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="floating-icon" style={{ animationDelay: '1s' }}>
                      <Clock className="h-8 w-8 text-[#FFD000]" />
                    </div>
                    <h4 className="text-xl font-bold">{t('contactHoursTitle')}</h4>
                  </div>
                  <div className="text-gray-300 space-y-2">
                    <div>{t('contactHours1')}</div>
                    <div>{t('contactHours2')}</div>
                  </div>
                </div>
                
                <div className={`info-card rounded-xl p-6 text-white will-animate ${isVisible ? 'slide-in-visible' : ''}`} style={{ animationDelay: '0.7s' }}>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="floating-icon" style={{ animationDelay: '2s' }}>
                      <Mail className="h-8 w-8 text-[#FFD000]" />
                    </div>
                    <h4 className="text-xl font-bold">{t('contactEmailTitle')}</h4>
                  </div>
                  <div className="text-gray-300">
                    <div>{t('contactEmail1')}</div>
                    <div>{t('contactEmail2')}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Quick Contact Stats */}
            <div className={`bg-white rounded-2xl p-8 shadow-xl will-animate ${isVisible ? 'slide-in-visible' : ''}`} style={{ animationDelay: '0.8s' }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-3xl font-black text-[#FFD000] mb-2">&lt;2min</div>
                  <div className="text-gray-600">Average Response Time</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-[#FFD000] mb-2">24/7</div>
                  <div className="text-gray-600">WhatsApp Support</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-[#FFD000] mb-2">99%</div>
                  <div className="text-gray-600">Customer Satisfaction</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-[#FFD000] mb-2">100+</div>
                  <div className="text-gray-600">Calls Handled Daily</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
  );
};

export default ContactSection;