import React, { useState, useEffect, useRef } from 'react';
import { Rocket, Eye, Target, Award } from 'lucide-react';

interface AboutSectionProps {
  t: (key: string) => string;
}

const AboutSection: React.FC<AboutSectionProps> = ({ t }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  const tabs = [
    {
      id: 'mission',
      title: t('missionTitle'),
      description: t('missionDesc'),
      icon: <Rocket className="h-12 w-12" />,
      color: 'from-[#001f3d] to-[#001f3d]',
      stats: [
        { label: 'Local Businesses Served', value: '500+' },
        { label: 'Packages Delivered', value: '50K+' },
        { label: 'Cities Covered', value: '25+' }
      ]
    },
    {
      id: 'vision',
      title: t('visionTitle'),
      description: t('visionDesc'),
      icon: <Eye className="h-12 w-12" />,
      color: 'from-[#e51717] to-[#e51717]',
      stats: [
        { label: 'Growth Target', value: '200%' },
        { label: 'New Partnerships', value: '100+' },
        { label: 'Market Coverage', value: '80%' }
      ]
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
      setActiveTab((prev) => (prev + 1) % tabs.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [tabs.length]);

  return (
      <section ref={sectionRef} id="about" className="about-bg py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`will-animate text-4xl font-bold text-[#061A40] mb-6 ${isVisible ? 'slide-in-visible' : ''}`}>
              {t('aboutTitle')}
            </h2>
            <p className={`will-animate text-xl text-gray-600 max-w-3xl mx-auto ${isVisible ? 'slide-in-visible' : ''}`} style={{ animationDelay: '0.2s' }}>
              {t('aboutSubtitle')}
            </p>
          </div>
          
          <div className="max-w-6xl mx-auto">
            {/* Tab Buttons */}
            <div className="flex flex-col md:flex-row justify-center mb-12 space-y-4 md:space-y-0 md:space-x-8">
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(index)}
                  className={`tab-button p-8 rounded-2xl text-center w-full md:w-auto will-animate ${
                    activeTab === index
                      ? 'active text-[#061A40] shadow-2xl'
                      : 'bg-white text-gray-700 hover:shadow-lg'
                  } ${isVisible ? 'slide-in-visible' : ''}`}
                  style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                >
                  <div className={`floating-icon mx-auto mb-4 ${activeTab === index ? 'text-[#061A40]' : 'text-[#FFD000]'}`}>
                    {tab.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{tab.title}</h3>
                  <p className={`text-sm ${activeTab === index ? 'text-[#061A40]/80' : 'text-gray-600'}`}>
                    {t('aboutClickToLearn')}
                  </p>
                </button>
              ))}
            </div>
            
            {/* Active Tab Content */}
            <div className="tab-content bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="grid md:grid-cols-2 gap-0">
                <div className="p-8 md:p-12">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="p-4 bg-[#FFD000] rounded-xl text-[#061A40]">
                      {tabs[activeTab].icon}
                    </div>
                    <h3 className="text-3xl font-bold text-[#061A40]">
                      {tabs[activeTab].title}
                    </h3>
                  </div>
                  <p className="text-lg text-gray-700 leading-relaxed mb-8">
                    {tabs[activeTab].description}
                  </p>
                  
                  {/* Achievement Indicators */}
                  <div className="space-y-4">
                    {tabs[activeTab].stats.map((stat, index) => (
                      <div key={index} className="stat-item flex items-center justify-between p-4 bg-gray-50 rounded-lg" style={{ animationDelay: `${index * 0.1}s` }}>
                        <span className="text-[#061A40] font-medium">{stat.label}</span>
                        <span className="text-2xl font-bold text-[#FFD000]">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className={`bg-gradient-to-br ${tabs[activeTab].color} p-8 md:p-12 text-white flex items-center justify-center`}>
                  <div className="text-center">
                    <div className="floating-icon mb-8">
                      <Target className="h-24 w-24 mx-auto text-white/80" />
                    </div>
                    <h4 className="text-2xl font-bold mb-4">{t('aboutCommitment')}</h4>
                    <p className="text-lg opacity-90 mb-6">
                      {activeTab === 0 
                        ? t('aboutMissionCommitment')
                        : t('aboutVisionCommitment')
                      }
                    </p>
                    <div className="flex justify-center">
                      <Award className="h-16 w-16 text-yellow-300" />
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

export default AboutSection;