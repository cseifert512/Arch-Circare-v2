import React from 'react';

interface FeedbackButtonsProps {
  imageId: string;
  isLiked?: boolean;
  isDisliked?: boolean;
  onLike: (imageId: string) => void;
  onDislike: (imageId: string) => void;
}

export default function FeedbackButtons({ 
  imageId, 
  isLiked = false, 
  isDisliked = false, 
  onLike, 
  onDislike 
}: FeedbackButtonsProps) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 8,
      right: 8,
      display: 'flex',
      gap: 4,
      zIndex: 10
    }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onLike(imageId);
        }}
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: 'none',
          backgroundColor: isLiked ? '#10b981' : 'rgba(255, 255, 255, 0.9)',
          color: isLiked ? 'white' : '#374151',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          fontWeight: 'bold',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        title="Like this result"
      >
        👍
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDislike(imageId);
        }}
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: 'none',
          backgroundColor: isDisliked ? '#ef4444' : 'rgba(255, 255, 255, 0.9)',
          color: isDisliked ? 'white' : '#374151',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          fontWeight: 'bold',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        title="Dislike this result"
      >
        👎
      </button>
    </div>
  );
}
