import PropTypes from 'prop-types';

/**
 * Skeleton — loading placeholder with shimmer animation.
 * Use while content is being fetched to prevent the "frozen" feeling.
 *
 * @param {string} [variant='text'] - Shape variant: text, title, card, avatar, button
 * @param {string} [className] - Additional CSS classes (e.g. width overrides)
 */
export function Skeleton({ className = '', variant = 'text' }) {
  const variants = {
    text:   'h-4 rounded-md',
    title:  'h-7 rounded-md',
    card:   'h-32 rounded-[18px]',
    avatar: 'w-9 h-9 rounded-full',
    button: 'h-11 w-24 rounded-xl',
  };

  return (
    <div
      className={`
        bg-bg-tertiary relative overflow-hidden
        ${variants[variant]} ${className}
      `}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"
      />
    </div>
  );
}

Skeleton.propTypes = {
  className: PropTypes.string,
  variant: PropTypes.oneOf(['text', 'title', 'card', 'avatar', 'button']),
};

/**
 * SkeletonList — pre-built loading pattern for lists.
 * Shows N rows of avatar + two text lines.
 *
 * @param {number} [count=3] - Number of skeleton rows
 */
export function SkeletonList({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex gap-3 p-4">
          <Skeleton variant="avatar" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="w-3/4" />
            <Skeleton variant="text" className="w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

SkeletonList.propTypes = {
  count: PropTypes.number,
};

export default Skeleton;
