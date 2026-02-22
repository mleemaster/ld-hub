/*
 * OpenClaw page — AI employee visibility and control.
 * Sections: Activity Feed, Queue, Message Templates, Cost Tracking, Status.
 */

export default function OpenClawPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-text-primary">OpenClaw</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-surface-secondary p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-text-tertiary" />
            <h3 className="text-sm font-medium text-text-secondary">Status</h3>
          </div>
          <p className="text-lg font-semibold text-text-primary">Not Connected</p>
          <p className="text-xs text-text-tertiary mt-1">Awaiting OpenClaw setup</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-secondary p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-2">Messages Sent</h3>
          <p className="text-3xl font-semibold text-text-primary">--</p>
          <p className="text-xs text-text-tertiary mt-1">Today</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-secondary p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-2">API Spend</h3>
          <p className="text-3xl font-semibold text-text-primary">$0.00</p>
          <p className="text-xs text-text-tertiary mt-1">This month</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-surface-secondary p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Activity Feed</h3>
          <p className="text-sm text-text-tertiary">No activity recorded yet</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-secondary p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Queue</h3>
          <p className="text-sm text-text-tertiary">No pending tasks</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface-secondary p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-text-secondary">Message Templates</h3>
          <button className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors cursor-pointer">
            New Template
          </button>
        </div>
        <p className="text-sm text-text-tertiary">No templates created yet</p>
      </div>

      <div className="rounded-2xl border border-border bg-surface-secondary p-6">
        <h3 className="text-sm font-medium text-text-secondary mb-4">Cost Tracking</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-text-tertiary">Cost per Lead</p>
            <p className="text-lg font-semibold text-text-primary mt-1">--</p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">Cost per Message</p>
            <p className="text-lg font-semibold text-text-primary mt-1">--</p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">This Week</p>
            <p className="text-lg font-semibold text-text-primary mt-1">$0.00</p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">This Month</p>
            <p className="text-lg font-semibold text-text-primary mt-1">$0.00</p>
          </div>
        </div>
      </div>
    </div>
  );
}
