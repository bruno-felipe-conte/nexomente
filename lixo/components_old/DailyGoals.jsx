// Daily Goals Component - Shows progress bars for study sessions
export default function DailyGoals({ goals }) {
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Missões Diárias</h2>
      
      {goals.map((goal) => (
        <div key={goal.id} style={styles.goalItem}>
          <div style={styles.icon}>{goal.icon}</div>
          <div style={styles.info}>
            <strong>{goal.title}</strong>
            <span style={styles.subtitle}>{goal.description}</span>
          </div>
          <div style={styles.progressContainer}>
            <div 
              style={{
                ...styles.progressBar, 
                width: `${goal.progress}%`,
                background: goal.progress === 100 ? '#22c55e' : '#3b82f6'
              }}
            ></div>
          </div>
          <span style={styles.percentage}>{goal.progress}%</span>
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '0.75rem',
    padding: '1.5rem',
    width: '340px'
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '1.25rem',
    color: '#1f2937'
  },
  goalItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 0'
  },
  icon: {
    fontSize: '1.25rem',
    flexShrink: 0
  },
  info: {
    flex: 1,
    minWidth: 0
  },
  progressContainer: {
    width: '80px',
    height: '6px',
    background: '#e5e7eb',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease'
  },
  percentage: {
    fontSize: '0.875rem',
    fontWeight: '500',
    minWidth: '30px',
    textAlign: 'right'
  }
};