// Study Sessions Component - Shows current session data or history
export default function StudySessions({ sessions }) {
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Sessões de Estudo</h2>
      
      {sessions.length === 0 ? (
        <style style={styles.placeholder}>
          Nenhum estudo registrado hoje. Inicie sua jornada!
        </style>
      ) : (
        <>
          {/* Session Summary */}
          <div style={styles.summary}>
            <div style={styles.summaryItem}>
              <strong style={{ fontWeight: '600' }}>{sessions.length}</strong>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>sessões</span>
            </div>
            <div style={styles.summaryItem}>
              <strong style={{ fontWeight: '600' }}>{Math.round(totalMinutes)}</strong>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>minutos</span>
            </div>
          </div>
          
          {/* Recent sessions list */}
          {[...sessions].reverse().slice(0, 3).map((session) => (
            <div key={session.id} style={styles.sessionItem}>
              <div style={styles.sessionTime}>
                {session.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={styles.sessionTopic}>{session.topic || 'Vocabulário'}</div>
              <div style={styles.sessionDuration}>
                🔥 {session.duration} min • {session.xp} XP
              </div>
            </div>
          ))}
        </>
      )}
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
  placeholder: {
    textAlign: 'center',
    padding: '2rem 0',
    color: '#9ca3af',
    fontStyle: 'italic'
  },
  summary: {
    background: linear-gradient(135deg, '#e0f2fe 0%, '#dbeafe' 100%);
    borderRadius: '0.75rem',
    padding: '1rem',
    marginBottom: '1rem'
  },
  summaryItem: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.25rem',
    fontSize: '0.875rem'
  },
  sessionItem: {
    background: '#f9fafb',
    borderRadius: '0.5rem',
    padding: '0.75rem',
    marginBottom: '0.5rem',
    fontSize: '0.875rem'
  },
  sessionTime: {
    fontWeight: '600',
    fontSize: '0.875rem',
    color: '#4b5563',
    marginBottom: '0.25rem'
  },
  sessionTopic: {
    marginBottom: '0.25rem',
    color: '#1f2937'
  },
  sessionDuration: {
    fontSize: '0.75rem',
    color: '#6b7280'
  }
};