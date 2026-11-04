export default function PageHeader({ title, description, children }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p className="page-sub">{description}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}
