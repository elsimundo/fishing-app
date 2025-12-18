import { useState } from 'react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { FileText, ChevronDown, ChevronRight, MapPin, Store, CheckCircle, Trophy } from 'lucide-react'

type DocSection = 'lakes' | 'businesses' | 'competitions' | null

export default function DocumentationPage() {
  const [expandedSection, setExpandedSection] = useState<DocSection>('lakes')

  const toggleSection = (section: DocSection) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8">
        <div className="mb-6 flex items-center gap-3 lg:mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
            <FileText size={24} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Documentation</h1>
            <p className="text-sm text-muted-foreground">Process guides and workflows</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Lakes Documentation */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('lakes')}
              className="flex w-full items-center justify-between p-5 text-left hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                  <MapPin size={20} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Lakes & Venues</h2>
                  <p className="text-sm text-muted-foreground">Claim and verification process</p>
                </div>
              </div>
              {expandedSection === 'lakes' ? (
                <ChevronDown size={20} className="text-muted-foreground" />
              ) : (
                <ChevronRight size={20} className="text-muted-foreground" />
              )}
            </button>

            {expandedSection === 'lakes' && (
              <div className="border-t border-border p-5">
                <LakesDocumentation />
              </div>
            )}
          </div>

          {/* Businesses Documentation */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('businesses')}
              className="flex w-full items-center justify-between p-5 text-left hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
                  <Store size={20} className="text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Businesses</h2>
                  <p className="text-sm text-muted-foreground">Tackle shops and services</p>
                </div>
              </div>
              {expandedSection === 'businesses' ? (
                <ChevronDown size={20} className="text-muted-foreground" />
              ) : (
                <ChevronRight size={20} className="text-muted-foreground" />
              )}
            </button>

            {expandedSection === 'businesses' && (
              <div className="border-t border-border p-5">
                <BusinessesDocumentation />
              </div>
            )}
          </div>

          {/* Competitions Documentation */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('competitions')}
              className="flex w-full items-center justify-between p-5 text-left hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                  <Trophy size={20} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Competitions</h2>
                  <p className="text-sm text-muted-foreground">How competitions work</p>
                </div>
              </div>
              {expandedSection === 'competitions' ? (
                <ChevronDown size={20} className="text-muted-foreground" />
              ) : (
                <ChevronRight size={20} className="text-muted-foreground" />
              )}
            </button>

            {expandedSection === 'competitions' && (
              <div className="border-t border-border p-5">
                <CompetitionsDocumentation />
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

function LakesDocumentation() {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">Overview</h3>
        <p className="text-sm text-muted-foreground">
          Lakes and fishing venues can be claimed by their owners or managers. Once verified, 
          they gain access to a dashboard where they can manage their venue details, team members, 
          and view analytics.
        </p>
      </div>

      {/* User Journey */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">User Claim Journey</h3>
        <div className="space-y-3">
          <StepCard
            number={1}
            title="Discovery"
            description="User visits a lake detail page and sees 'Own or manage this venue?' CTA (only shown for unclaimed lakes)"
            status="info"
          />
          <StepCard
            number={2}
            title="Claim Wizard (4 Steps)"
            description={
              <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                <li><strong>Step 1:</strong> Role & Contact (role at venue, email, phone, business name)</li>
                <li><strong>Step 2:</strong> Proof Upload (insurance, lease, utility bill, etc.)</li>
                <li><strong>Step 3:</strong> Venue Details (water type, prices, facilities - optional)</li>
                <li><strong>Step 4:</strong> Premium Interest & Terms acceptance</li>
              </ul>
            }
            status="info"
          />
          <StepCard
            number={3}
            title="Pending Review"
            description="After submission, user sees 'Claim Pending Review' message instead of claim button. Duplicate claims are prevented."
            status="pending"
          />
          <StepCard
            number={4}
            title="Notification"
            description="User receives a notification when claim is approved or rejected, with link to owner dashboard if approved."
            status="success"
          />
        </div>
      </div>

      {/* Admin Process */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Admin Review Process</h3>
        <div className="space-y-3">
          <StepCard
            number={1}
            title="View Pending Claims"
            description="Go to Admin → Lakes → 'Pending Claims' tab. Shows lakes with pending claims and count badge."
            status="info"
          />
          <StepCard
            number={2}
            title="Review Claim Details"
            description={
              <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                <li>Claimant's role and contact info</li>
                <li>Business name and website</li>
                <li>Proof document (click to view)</li>
                <li>Premium interest indicator</li>
              </ul>
            }
            status="info"
          />
          <StepCard
            number={3}
            title="Approve or Reject"
            description={
              <div className="mt-1 space-y-2">
                <p className="text-muted-foreground"><strong>Approve:</strong> Sets lake as verified, assigns owner, sends notification with dashboard link</p>
                <p className="text-muted-foreground"><strong>Reject:</strong> Sends notification with optional rejection reason</p>
              </div>
            }
            status="info"
          />
        </div>
      </div>

      {/* Post-Approval */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Post-Approval Features</h3>
        <div className="rounded-xl bg-background border border-border p-4">
          <p className="text-sm text-muted-foreground mb-3">Once approved, venue owners can:</p>
          <ul className="grid gap-2 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              <span className="text-foreground">Access Owner Dashboard with analytics</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              <span className="text-foreground">Edit venue details (prices, facilities, description)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              <span className="text-foreground">Manage team members (add managers, bailiffs)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              <span className="text-foreground">Post announcements visible to anglers</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              <span className="text-foreground">View catch reports and visitor stats</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Database Tables */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Database Tables</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 px-3 text-left font-medium text-muted-foreground">Table</th>
                <th className="py-2 px-3 text-left font-medium text-muted-foreground">Purpose</th>
              </tr>
            </thead>
            <tbody className="text-foreground">
              <tr className="border-b border-border">
                <td className="py-2 px-3 font-mono text-xs">lakes</td>
                <td className="py-2 px-3">Main venue data (claimed_by, is_verified, is_premium)</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 px-3 font-mono text-xs">lake_claims</td>
                <td className="py-2 px-3">Claim submissions (status: pending/approved/rejected)</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 px-3 font-mono text-xs">lake_team</td>
                <td className="py-2 px-3">Team members (owner, manager, bailiff roles)</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 px-3 font-mono text-xs">lake_announcements</td>
                <td className="py-2 px-3">Owner announcements shown on lake page</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-xs">notifications</td>
                <td className="py-2 px-3">Claim approval/rejection notifications</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Files */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Key Files</h3>
        <div className="space-y-2 text-sm">
          <div className="rounded-lg bg-background border border-border p-3">
            <p className="font-mono text-xs text-primary">src/components/lakes/ClaimLakeModal.tsx</p>
            <p className="text-muted-foreground mt-1">4-step claim wizard UI</p>
          </div>
          <div className="rounded-lg bg-background border border-border p-3">
            <p className="font-mono text-xs text-primary">src/pages/admin/LakesPage.tsx</p>
            <p className="text-muted-foreground mt-1">Admin claims review with approve/reject</p>
          </div>
          <div className="rounded-lg bg-background border border-border p-3">
            <p className="font-mono text-xs text-primary">src/hooks/useLakeClaims.ts</p>
            <p className="text-muted-foreground mt-1">useMyLakeClaims, useHasPendingClaim hooks</p>
          </div>
          <div className="rounded-lg bg-background border border-border p-3">
            <p className="font-mono text-xs text-primary">src/pages/LakeOwnerDashboard.tsx</p>
            <p className="text-muted-foreground mt-1">Venue owner dashboard with analytics</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function BusinessesDocumentation() {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">Overview</h3>
        <p className="text-sm text-muted-foreground">
          Businesses (tackle shops, fishing guides, charters, clubs) can be added in two ways:
          users can submit new businesses or claim existing ones from OpenStreetMap data.
        </p>
      </div>

      {/* Two Flows */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Two Separate Flows</h3>
        
        <div className="space-y-4">
          {/* Flow 1: Submit New */}
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
            <h4 className="font-medium text-blue-400 mb-2">Flow 1: Submit New Business</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>User goes to <code className="text-xs bg-muted px-1 rounded">/businesses/submit</code></li>
              <li>Fills form: name, type, address, phone, website</li>
              <li>Address is geocoded via Nominatim</li>
              <li>Creates record in <code className="text-xs bg-muted px-1 rounded">businesses</code> table with status "pending"</li>
              <li>Admin reviews in "Pending" tab → Approve/Reject</li>
            </ul>
          </div>

          {/* Flow 2: Claim Existing */}
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
            <h4 className="font-medium text-amber-400 mb-2">Flow 2: Claim Existing Business (OSM)</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>User sees unclaimed business on Explore map</li>
              <li>Clicks "Claim" → ClaimBusinessModal opens</li>
              <li>Selects relationship (owner/manager) + adds proof notes</li>
              <li>Creates record in <code className="text-xs bg-muted px-1 rounded">business_claims</code> table</li>
              <li>Admin reviews in "Claims" tab → Approve/Reject</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Admin Process */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Admin Review Process</h3>
        <div className="space-y-3">
          <StepCard
            number={1}
            title="View Pending Submissions"
            description="Go to Admin → Businesses → 'Pending' tab. Shows user-submitted businesses awaiting review."
            status="info"
          />
          <StepCard
            number={2}
            title="View Pending Claims"
            description="Go to Admin → Businesses → 'Claims' tab. Shows claims for existing OSM businesses with count badge."
            status="info"
          />
          <StepCard
            number={3}
            title="Approve or Reject"
            description={
              <div className="mt-1 space-y-2">
                <p className="text-muted-foreground"><strong>Approve:</strong> Sets business status to approved, assigns owner, sends notification</p>
                <p className="text-muted-foreground"><strong>Reject:</strong> Sets status to rejected, sends notification with optional reason</p>
              </div>
            }
            status="info"
          />
        </div>
      </div>

      {/* Business Types */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Business Types</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-background border border-border p-2">
            <span className="font-medium text-foreground">tackle_shop</span>
            <p className="text-xs text-muted-foreground">Tackle & bait retailers</p>
          </div>
          <div className="rounded-lg bg-background border border-border p-2">
            <span className="font-medium text-foreground">charter</span>
            <p className="text-xs text-muted-foreground">Charter boat services</p>
          </div>
          <div className="rounded-lg bg-background border border-border p-2">
            <span className="font-medium text-foreground">club</span>
            <p className="text-xs text-muted-foreground">Angling clubs/societies</p>
          </div>
          <div className="rounded-lg bg-background border border-border p-2">
            <span className="font-medium text-foreground">guide</span>
            <p className="text-xs text-muted-foreground">Professional guides</p>
          </div>
        </div>
      </div>

      {/* Database Tables */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Database Tables</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 px-3 text-left font-medium text-muted-foreground">Table</th>
                <th className="py-2 px-3 text-left font-medium text-muted-foreground">Purpose</th>
              </tr>
            </thead>
            <tbody className="text-foreground">
              <tr className="border-b border-border">
                <td className="py-2 px-3 font-mono text-xs">businesses</td>
                <td className="py-2 px-3">Main business data (status, claimed_by, is_premium)</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 px-3 font-mono text-xs">business_claims</td>
                <td className="py-2 px-3">Claims for existing OSM businesses</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-xs">notifications</td>
                <td className="py-2 px-3">Approval/rejection notifications</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Files */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Key Files</h3>
        <div className="space-y-2 text-sm">
          <div className="rounded-lg bg-background border border-border p-3">
            <p className="font-mono text-xs text-primary">src/pages/SubmitBusinessPage.tsx</p>
            <p className="text-muted-foreground mt-1">User form to submit new business</p>
          </div>
          <div className="rounded-lg bg-background border border-border p-3">
            <p className="font-mono text-xs text-primary">src/components/business/ClaimBusinessModal.tsx</p>
            <p className="text-muted-foreground mt-1">Modal for claiming existing OSM business</p>
          </div>
          <div className="rounded-lg bg-background border border-border p-3">
            <p className="font-mono text-xs text-primary">src/pages/admin/BusinessesPage.tsx</p>
            <p className="text-muted-foreground mt-1">Admin review page with Pending and Claims tabs</p>
          </div>
          <div className="rounded-lg bg-background border border-border p-3">
            <p className="font-mono text-xs text-primary">src/hooks/useBusinessClaims.ts</p>
            <p className="text-muted-foreground mt-1">useMyBusinessClaims, useMyBusinessSubmissions hooks</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CompetitionsDocumentation() {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">Overview</h3>
        <p className="text-sm text-muted-foreground">
          Competitions are collaborative fishing events where multiple anglers participate together.
          <strong className="text-foreground"> Key concept: A Competition IS a Session.</strong> Users join
          by becoming participants on the competition's backing session.
        </p>
      </div>

      {/* How It Works */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">How Competitions Work</h3>
        <div className="space-y-3">
          <StepCard
            number={1}
            title="Organizer Creates Competition"
            description="Creates competition with title, type, dates, and restrictions. A backing session is automatically created and linked."
            status="info"
          />
          <StepCard
            number={2}
            title="Users Join"
            description="Users click 'Join Competition' which adds them as a participant to the competition's session (session_participants table)."
            status="info"
          />
          <StepCard
            number={3}
            title="Log Catches"
            description="Participants log catches to the shared competition session. All catches from all participants are visible."
            status="info"
          />
          <StepCard
            number={4}
            title="Leaderboard Updates"
            description="Leaderboard automatically calculates rankings based on competition type (heaviest fish, most catches, species diversity)."
            status="pending"
          />
          <StepCard
            number={5}
            title="Winners Declared"
            description="When competition ends, organizer declares winners for each award category. Winners receive XP and unlock challenges."
            status="success"
          />
        </div>
      </div>

      {/* Competition Types */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Competition Types</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-background border border-border p-2">
            <span className="font-medium text-foreground">heaviest_fish</span>
            <p className="text-xs text-muted-foreground">Biggest single catch wins</p>
          </div>
          <div className="rounded-lg bg-background border border-border p-2">
            <span className="font-medium text-foreground">most_catches</span>
            <p className="text-xs text-muted-foreground">Most fish caught wins</p>
          </div>
          <div className="rounded-lg bg-background border border-border p-2">
            <span className="font-medium text-foreground">species_diversity</span>
            <p className="text-xs text-muted-foreground">Most unique species wins</p>
          </div>
          <div className="rounded-lg bg-background border border-border p-2">
            <span className="font-medium text-foreground">photo_contest</span>
            <p className="text-xs text-muted-foreground">Best photo (judged)</p>
          </div>
        </div>
      </div>

      {/* Challenges Integration */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Challenge Integration</h3>
        <div className="rounded-xl bg-background border border-border p-4">
          <p className="text-sm text-muted-foreground mb-3">Competition-related challenges that award XP:</p>
          <ul className="grid gap-2 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              <span className="text-foreground"><strong>comp_entered</strong> - Join your first competition</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              <span className="text-foreground"><strong>comp_5_entered</strong> - Join 5 competitions</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              <span className="text-foreground"><strong>comp_winner</strong> - Win a competition</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              <span className="text-foreground"><strong>comp_podium</strong> - Finish in top 3</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Database Tables */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Database Tables</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 px-3 text-left font-medium text-muted-foreground">Table</th>
                <th className="py-2 px-3 text-left font-medium text-muted-foreground">Purpose</th>
              </tr>
            </thead>
            <tbody className="text-foreground">
              <tr className="border-b border-border">
                <td className="py-2 px-3 font-mono text-xs">competitions</td>
                <td className="py-2 px-3">Competition metadata (title, type, dates, session_id)</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 px-3 font-mono text-xs">session_participants</td>
                <td className="py-2 px-3">How users join (links to competition's session)</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 px-3 font-mono text-xs">competition_winners</td>
                <td className="py-2 px-3">Winner declarations per category</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 px-3 font-mono text-xs">competition_invites</td>
                <td className="py-2 px-3">Invite-only competition invitations</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-xs">catches</td>
                <td className="py-2 px-3">Catches linked to competition's session_id</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Files */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Key Files</h3>
        <div className="space-y-2 text-sm">
          <div className="rounded-lg bg-background border border-border p-3">
            <p className="font-mono text-xs text-primary">src/pages/CompetePage.tsx</p>
            <p className="text-muted-foreground mt-1">Main competitions list (your comps + available)</p>
          </div>
          <div className="rounded-lg bg-background border border-border p-3">
            <p className="font-mono text-xs text-primary">src/pages/CompetitionDetailPage.tsx</p>
            <p className="text-muted-foreground mt-1">Competition detail with leaderboard, catches, winners</p>
          </div>
          <div className="rounded-lg bg-background border border-border p-3">
            <p className="font-mono text-xs text-primary">src/pages/CreateCompetitionPage.tsx</p>
            <p className="text-muted-foreground mt-1">Multi-step competition creation wizard</p>
          </div>
          <div className="rounded-lg bg-background border border-border p-3">
            <p className="font-mono text-xs text-primary">src/components/compete/EnterSessionButton.tsx</p>
            <p className="text-muted-foreground mt-1">Join button (adds to session_participants + triggers challenges)</p>
          </div>
          <div className="rounded-lg bg-background border border-border p-3">
            <p className="font-mono text-xs text-primary">src/hooks/useCompetitions.ts</p>
            <p className="text-muted-foreground mt-1">Competition CRUD hooks</p>
          </div>
          <div className="rounded-lg bg-background border border-border p-3">
            <p className="font-mono text-xs text-primary">src/hooks/useCompetitionWinners.ts</p>
            <p className="text-muted-foreground mt-1">Winner declaration (triggers winner/podium challenges)</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepCard({ 
  number, 
  title, 
  description, 
  status 
}: { 
  number: number
  title: string
  description: React.ReactNode
  status: 'info' | 'pending' | 'success' | 'error'
}) {
  const statusColors = {
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
  }

  return (
    <div className={`rounded-xl border p-4 ${statusColors[status]}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-current/20 text-sm font-bold">
          {number}
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground">{title}</p>
          <div className="text-sm mt-1">{description}</div>
        </div>
      </div>
    </div>
  )
}
