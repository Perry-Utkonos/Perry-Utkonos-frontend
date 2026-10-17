export default function PageState({ title, message, retry }: { title: string; message?: string | null; retry?: () => void }) {
  return <div className="page-state" role={retry ? 'alert' : 'status'}><h2>{title}</h2>{message && <p>{message}</p>}{retry && <button className="button button-subtle" onClick={retry}>Попробовать снова</button>}</div>
}
