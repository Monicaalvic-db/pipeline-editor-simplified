export default function WorkspaceShellPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Workspace Shell</h1>
        <p className="text-muted-foreground">
          This is an example of the Databricks workspace shell interface with brand header and sidebar.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-card p-4 rounded-lg border">
          <h3 className="font-semibold mb-2">Recent Workspaces</h3>
          <p className="text-sm text-muted-foreground">Access your recent workspaces and projects</p>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <h3 className="font-semibold mb-2">Quick Actions</h3>
          <p className="text-sm text-muted-foreground">Create notebooks, clusters, and more</p>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <h3 className="font-semibold mb-2">Resources</h3>
          <p className="text-sm text-muted-foreground">Manage your data and compute resources</p>
        </div>
      </div>
    </div>
  );
}
