import React, { useEffect, useState, useRef } from 'react';
import { Star, Quote } from 'lucide-react';
import StarBorder from '../common/StarBorder';

interface TestimonialsSectionProps {
  t: (key: string) => string;
}

const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({ t }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  const testimonials = [
    {
      quote: t('testimonial1'),
      name: t('testimonial1Name'),
      role: t('testimonial1Role'),
      rating: 5
    },
    {
      quote: t('testimonial2'),
      name: t('testimonial2Name'),
      role: t('testimonial2Role'),
      rating: 5
    },
    {
      quote: t('testimonial3'),
      name: t('testimonial3Name'),
      role: t('testimonial3Role'),
      rating: 5
    },
    {
      quote: t('testimonial4'),
      name: t('testimonial4Name'),
      role: t('testimonial4Role'),
      rating: 5
    },
    {
      quote: t('testimonial5'),
      name: t('testimonial5Name'),
      role: t('testimonial5Role'),
      rating: 5
    },
    {
      quote: t('testimonial6'),
      name: t('testimonial6Name'),
      role: t('testimonial6Role'),
      rating: 5
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
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [testimonials.length]);

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToTestimonial = (index: number) => {
    setCurrentTestimonial(index);
  };

  return (
      <section ref={sectionRef} id="testimonials" className="testimonials-bg py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`will-animate text-4xl font-bold text-white mb-6 ${isVisible ? 'slide-in-visible' : ''}`}>
              {t('testimonialsTitle')}
            </h2>
            <p className={`will-animate text-xl text-gray-300 max-w-3xl mx-auto ${isVisible ? 'slide-in-visible' : ''}`} style={{ animationDelay: '0.2s' }}>
              {t('testimonialsSubtitle')}
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            {/* Main Featured Testimonial Carousel */}
            <div className={`testimonial-card rounded-2xl p-8 md:p-12 mb-12 relative will-animate ${isVisible ? 'slide-in-visible' : ''}`} style={{ animationDelay: '0.4s' }}>
              <Quote className="quote-icon absolute top-6 left-6 h-16 w-16 text-[#FFD000]" />
              
              {/* Carousel Navigation Arrows */}
              <StarBorder
                as="button"
                onClick={prevTestimonial}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 backdrop-blur-sm"
                color="white"
                speed="8s"
                innerClassName="bg-gray-500/30 hover:bg-gray-500/50 text-gray-300 hover:text-white rounded-full p-3 transition-all duration-300"
                aria-label="Previous testimonial"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </StarBorder>
              
              <StarBorder
                as="button"
                onClick={nextTestimonial}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 backdrop-blur-sm"
                color="white"
                speed="8s"
                innerClassName="bg-gray-500/30 hover:bg-gray-500/50 text-gray-300 hover:text-white rounded-full p-3 transition-all duration-300"
                aria-label="Next testimonial"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </StarBorder>
              
              <div key={currentTestimonial} className="testimonial-transition px-12">
                <div className="flex star-rating justify-center mb-6">
                  {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                    <Star key={i} className="h-6 w-6 text-[#FFD000] fill-current" />
                  ))}
                </div>
                
                <blockquote className="text-2xl md:text-3xl text-[#061A40] font-medium text-center mb-8 leading-relaxed">
                  {testimonials[currentTestimonial].quote}
                </blockquote>
                
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-xl font-bold text-[#061A40]">
                      {testimonials[currentTestimonial].name}
                    </div>
                    <div className="text-gray-600">
                      {testimonials[currentTestimonial].role}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Testimonial Navigation Dots */}
            <div className="flex justify-center space-x-3">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToTestimonial(index)}
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    currentTestimonial === index
                      ? 'bg-[#FFD000] scale-125'
                      : 'bg-gray-500/40 hover:bg-gray-400/60'
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
  );
};

export default TestimonialsSection;