import React, { useEffect, useState, useRef } from 'react';
import { Crown, Gem, Star, ArrowRight } from 'lucide-react';

interface SubscriptionsSectionProps {
  t: (key: string) => string;
}

const SubscriptionsSection: React.FC<SubscriptionsSectionProps> = ({ t }) => {
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

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
      <section ref={sectionRef} id="subscriptions" className="subscriptions-bg py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className={`exclusive-card rounded-3xl p-12 md:p-16 text-center text-white relative overflow-hidden will-animate ${isVisible ? 'slide-in-visible' : ''}`}>
              {/* Background Elements */}
              <div className="absolute top-10 left-10 floating-gems opacity-20">
                <Gem className="h-16 w-16 text-[#FFD000]" />
              </div>
              <div className="absolute top-20 right-20 floating-gems opacity-15" style={{ animationDelay: '2s' }}>
                <Crown className="h-20 w-20 text-[#FFD000]" />
              </div>
              <div className="absolute bottom-16 left-16 floating-gems opacity-25" style={{ animationDelay: '4s' }}>
                <Star className="h-12 w-12 text-[#FFD000] star-twinkle" />
              </div>
              <div className="absolute bottom-20 right-10 floating-gems opacity-20" style={{ animationDelay: '1s' }}>
                <Gem className="h-14 w-14 text-[#FFD000]" />
              </div>
              
              {/* Shimmer overlay */}
              <div className="absolute inset-0 shimmer"></div>
              
              {/* Content */}
              <div className="relative z-10">
                <div className="mb-8">
                  <div className="p-4 bg-[#FFD000] rounded-full inline-block mb-6">
                    <Crown className="h-16 w-16 text-[#061A40]" />
                  </div>
                </div>
                
                <h2 className="text-4xl md:text-5xl font-black mb-6">
                  {t('subscriptionsTitle')}
                </h2>
                
                <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8 leading-relaxed">
                  {t('subscriptionsDesc')}
                </p>
                
                {/* Benefits Grid */}
                <div className="grid md:grid-cols-3 gap-6 mb-10">
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
                    <Star className="h-10 w-10 text-[#FFD000] mx-auto mb-4" />
                    <h4 className="text-lg font-bold mb-2">Exclusive Rates</h4>
                    <p className="text-sm text-gray-300">Up to 30% discount on regular shipping rates</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
                    <Crown className="h-10 w-10 text-[#FFD000] mx-auto mb-4" />
                    <h4 className="text-lg font-bold mb-2">Priority Service</h4>
                    <p className="text-sm text-gray-300">Jump the queue with priority processing</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
                    <Gem className="h-10 w-10 text-[#FFD000] mx-auto mb-4" />
                    <h4 className="text-lg font-bold mb-2">Dedicated Support</h4>
                    <p className="text-sm text-gray-300">24/7 premium customer service</p>
                  </div>
                </div>
                
                <button
                  onClick={() => scrollToSection('contact')}
                  className="cta-button px-10 py-4 rounded-xl text-xl font-bold text-[#061A40] flex items-center mx-auto group"
                >
                  {t('subscriptionsCTA')}
                  <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </button>
                
                <div className="mt-8 text-sm text-gray-400">
                  * Partnership criteria based on monthly volume and business requirements
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
  );
};

export default SubscriptionsSection;