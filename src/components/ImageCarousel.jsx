import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './ImageCarousel.css';

export default function ImageCarousel({ images, onImageClick }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleSegmentClick = (e, index) => {
    e.stopPropagation();
    setCurrentIndex(index);
  };

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="carousel-stage">
      <div className="carousel-stage-header">
        <span className="carousel-eyebrow">Galerie</span>
        <span className="carousel-count">
          {pad(currentIndex + 1)} / {pad(images.length)}
        </span>
      </div>

      <div className="carousel-frame">
        <div className="carousel-inner-container">
          <div className="carousel-img-wrapper" onClick={() => onImageClick?.(images, currentIndex)}>
            <img 
              src={images[currentIndex]} 
              alt={`Slide ${currentIndex + 1}`} 
              loading="lazy"
            />
            <div className="carousel-caption-overlay"></div>
          </div>

          {images.length > 1 && (
            <>
              <button className="carousel-nav-btn carousel-nav-prev" type="button" onClick={handlePrev} aria-label="Image précédente">
                <ChevronLeft size={20} />
              </button>
              <button className="carousel-nav-btn carousel-nav-next" type="button" onClick={handleNext} aria-label="Image suivante">
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      {images.length > 1 && (
        <div className="carousel-progress-track">
          {images.map((_, idx) => (
            <div 
              key={idx} 
              className={`carousel-segment ${idx === currentIndex ? 'active' : ''} ${idx < currentIndex ? 'done' : ''}`}
              onClick={(e) => handleSegmentClick(e, idx)}
            >
              <div className="carousel-fill"></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
