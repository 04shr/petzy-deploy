import React, { useEffect } from 'react';

const BackgroundParticles = () => {
  useEffect(() => {
    const container = document.getElementById('particles');
    const colors = ['#00ffff', '#ff00ff', '#39ff14', '#ffd700'];
    
    // Clear existing particles
    container.innerHTML = '';
    
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      particle.style.background = colors[Math.floor(Math.random() * colors.length)];
      particle.style.boxShadow = `0 0 10px ${colors[Math.floor(Math.random() * colors.length)]}`;
      particle.style.animationDelay = Math.random() * 6 + 's';
      particle.style.animationDuration = (Math.random() * 4 + 4) + 's';
      container.appendChild(particle);
    }
  }, []);

  return <div className="bg-particles" id="particles"></div>;
};

export default BackgroundParticles;