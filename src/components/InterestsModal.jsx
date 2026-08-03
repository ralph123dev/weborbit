import { ArrowRight, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import pubImage from '../assets/pub.jpg';
import './ProfileSetupModal.css'; 

const TECH_KEYWORDS = [
  'tech', 'it', 'dev', 'code', 'informatique', 'web', 'logiciel', 
  'programmation', 'ordinateur', 'software', 'ia', 'ai', 'data',
  'developpeur', 'developer', 'internet', 'cyber'
];

export default function InterestsModal({ onClose }) {
  const [step, setStep] = useState(1); // 1: Interests input, 2: Hokay pub
  const [interests, setInterests] = useState(['', '', '']);
  const [error, setError] = useState('');

  const handleInterestChange = (index, value) => {
    const newInterests = [...interests];
    newInterests[index] = value;
    setInterests(newInterests);
  };

  const handleNext = () => {
    // Check if all 3 are filled
    if (interests.some(i => !i.trim())) {
      setError('Veuillez entrer exactement 3 centres d\'intérêt.');
      return;
    }

    // Check if any is tech related
    const hasTechInterest = interests.some(interest => {
      const lower = interest.toLowerCase();
      return TECH_KEYWORDS.some(kw => lower.includes(kw));
    });

    if (hasTechInterest) {
      setStep(2);
    } else {
      finishSetup();
    }
  };

  const finishSetup = () => {
    onClose();
  };

  return (
    <div className="profile-setup-overlay" style={{ zIndex: 10000 }}>
      {step === 1 && (
        <div className="profile-setup-modal glass" style={{ maxWidth: '450px' }}>
          <div className="profile-setup-header" style={{ marginBottom: '1rem' }}>
            <h2 className="profile-setup-title flex items-center justify-center gap-2">
              <Sparkles className="text-primary" /> Vos centres d'intérêt
            </h2>
            <p className="profile-setup-subtitle text-center mt-2">
              Pour mieux personnaliser votre expérience, entrez 3 de vos passions ou centres d'intérêt.
            </p>
          </div>

          {error && <div className="profile-setup-error">{error}</div>}

          <div className="flex flex-col gap-4 mt-6">
            {interests.map((val, idx) => (
              <div className="profile-input-group" key={idx}>
                <label>Centre d'intérêt {idx + 1}</label>
                <div className="profile-input-wrapper">
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => handleInterestChange(idx, e.target.value)}
                    placeholder={
                      idx === 0 ? "Ex: Musique" : 
                      idx === 1 ? "Ex: Informatique" : "Ex: Sport"
                    }
                    className="w-full"
                    style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none' }}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleNext}
            className="profile-setup-submit-btn w-full mt-8"
          >
            Suivant <ArrowRight size={18} />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="profile-setup-modal glass" style={{ maxWidth: '400px', padding: 0, overflow: 'hidden', position: 'relative' }}>
          <button 
            onClick={finishSetup}
            className="absolute top-3 right-3 bg-black bg-opacity-50 text-white rounded-full p-1 z-10 hover:bg-opacity-80 transition"
          >
            <X size={20} />
          </button>

          <img 
            src={pubImage} 
            alt="Hokay Platform" 
            className="w-full" 
            style={{ objectFit: 'contain', maxHeight: '300px', display: 'block', backgroundColor: 'black' }}
          />
          
          <div className="p-4 bg-surface flex gap-3">
            <button 
              onClick={finishSetup}
              className="btn btn-secondary flex-1 font-bold"
            >
              Annuler
            </button>
            <button 
              onClick={() => {
                window.open('https://hokay.site', '_blank');
                finishSetup();
              }}
              className="btn btn-primary flex-1 font-bold"
            >
              Visiter le site
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
