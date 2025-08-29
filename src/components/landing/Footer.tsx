import React from 'react';
import { Zap, Facebook, Twitter, Linkedin, Mail, Phone, MapPin } from 'lucide-react';

interface FooterProps {
  t: (key: string) => string;
}

const Footer: React.FC<FooterProps> = ({ t }) => {
  const currentYear = new Date().getFullYear();

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <div className="wave-border"></div>
      <footer className="footer-bg text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="col-span-1 lg:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="logo-glow">
                  <img src="/shuhna-logo-main.png" alt="Shuhna Express Logo" className="h-10 w-10 object-contain" />
                </div>
                <h3 className="text-3xl font-bold bg-gradient-to-r from-[#FFD000] to-[#FFF700] bg-clip-text text-transparent">
                  Shuhna Express
                </h3>
              </div>
              <p className="text-xl text-gray-300 mb-6 leading-relaxed">
                {t('footerSlogan')}
              </p>
              
              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-[#FFD000]" />
                  <span className="text-gray-300">+2 010 3267 4447</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-[#FFD000]" />
                  <span className="text-gray-300">info@shuhna.net</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-[#FFD000]" />
                  <span className="text-gray-300">New Cairo - Egypt</span>
                </div>
              </div>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="text-xl font-bold text-[#FFD000] mb-6">{t('footerLinks')}</h4>
              <ul className="space-y-3">
                {[
                  { key: 'navServices', section: 'services' },
                  { key: 'navAbout', section: 'about' },
                  { key: 'navPricing', section: 'pricing' },
                  { key: 'navSubscriptions', section: 'subscriptions' },
                  { key: 'footerTrack', section: 'tracking' },
                  { key: 'navContact', section: 'contact' }
                ].map((link) => (
                  <li key={link.key}>
                    <button
                      onClick={() => scrollToSection(link.section)}
                      className="footer-link text-gray-300 hover:text-[#FFD000] text-left"
                    >
                      {t(link.key)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Social Links */}
            <div>
              <h4 className="text-xl font-bold text-[#FFD000] mb-6">{t('footerFollow')}</h4>
              <div className="flex space-x-4">
                <a
                  href="#"
                  className="social-icon p-3 bg-white/10 rounded-full text-gray-300 hover:bg-[#FFD000] hover:text-[#061A40] transition-all duration-300"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="social-icon p-3 bg-white/10 rounded-full text-gray-300 hover:bg-[#FFD000] hover:text-[#061A40] transition-all duration-300"
                >
                  <Twitter className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="social-icon p-3 bg-white/10 rounded-full text-gray-300 hover:bg-[#FFD000] hover:text-[#061A40] transition-all duration-300"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
              </div>
              
              <div className="mt-8">
                <h5 className="font-semibold mb-3 text-[#FFD000]">Business Hours</h5>
                <div className="text-sm text-gray-400 space-y-1">
                  <div>Sun-Thu: 9:00 AM - 8:00 PM</div>
                  <div>Fri-Sat: 10:00 AM - 6:00 PM</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-white/20">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-gray-400 text-sm">
                &copy; {currentYear} Shuhna Express. {t('footerRights')}
              </div>
              <div className="flex space-x-6 text-sm text-gray-400">
                <a href="#" className="hover:text-[#FFD000] transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-[#FFD000] transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-[#FFD000] transition-colors">Cookie Policy</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
