import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type ClaimStatus = 'Needs review' | 'More information' | 'Approved' | 'Declined';
type Recommendation = 'Review required' | 'Likely eligible' | 'Missing evidence' | 'High amount variance';

interface AuditEvent {
  claimId: string;
  hospital: string;
  action: string;
  reason: string;
  time: string;
}

interface Claim {
  id: string;
  member: string;
  hospital: string;
  procedure: string;
  diagnosis: string;
  amount: number;
  received: string;
  minutesLeft: number;
  urgency: 'Urgent' | 'Standard';
  status: ClaimStatus;
  recommendation: Recommendation;
  confidence: number;
  summary: string;
  signals: string[];
  missing: string[];
  notes: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  searchText = '';
  statusFilter = 'All statuses';
  selectedClaimId = 'PA-260184';
  activePage = 'Claims queue';
  toast = '';
  reviewerNote = '';
  actionReason = '';
  auditEvents: AuditEvent[] = [];

  claims: Claim[] = [
    {
      id: 'PA-260184', member: 'Member •••• 4812', hospital: 'Sahyadri Multispeciality',
      procedure: 'Laparoscopic cholecystectomy', diagnosis: 'K80.20 · Gallstones without obstruction',
      amount: 148000, received: '08:42 AM', minutesLeft: 4, urgency: 'Urgent', status: 'Needs review',
      recommendation: 'Review required', confidence: 78,
      summary: 'The diagnosis and requested procedure appear related, but the submitted note does not describe symptom duration or relevant imaging findings. The model cannot confirm clinical necessity from the current note alone.',
      signals: ['Clinical note is missing symptom duration', 'Imaging findings are not attached', 'Requested amount is 18% above the package reference'],
      missing: ['Ultrasound or imaging report', 'Duration and severity of symptoms'],
      notes: 'Patient admitted with abdominal pain. Planned laparoscopic procedure. Please approve at the earliest.'
    },
    {
      id: 'PA-260193', member: 'Member •••• 9075', hospital: 'Lotus Heart Centre',
      procedure: 'Coronary angiography', diagnosis: 'I20.9 · Angina pectoris, unspecified',
      amount: 92000, received: '08:47 AM', minutesLeft: 9, urgency: 'Urgent', status: 'Needs review',
      recommendation: 'Missing evidence', confidence: 71,
      summary: 'The request may be time-sensitive, but the note does not include ECG findings or the treating clinician’s assessment. Do not use the missing information alone as a reason to refuse emergency care.',
      signals: ['ECG or clinical assessment not attached', 'Emergency status is not clearly documented'],
      missing: ['ECG or relevant investigation', 'Treating doctor assessment'],
      notes: 'Chest discomfort since morning. Angiography advised. Reports will be shared shortly.'
    },
    {
      id: 'PA-260201', member: 'Member •••• 2260', hospital: 'CityCare Hospital',
      procedure: 'Total knee replacement', diagnosis: 'M17.11 · Unilateral primary osteoarthritis',
      amount: 285000, received: '08:50 AM', minutesLeft: 12, urgency: 'Standard', status: 'More information',
      recommendation: 'High amount variance', confidence: 84,
      summary: 'The requested amount is higher than the configured package reference. The clinical note also does not state prior conservative treatment. Validate both the package terms and clinical records before deciding.',
      signals: ['Requested amount is 26% above package reference', 'Prior treatment history is not included'],
      missing: ['Breakdown of requested amount', 'Relevant prior treatment history'],
      notes: 'Patient has severe knee pain and difficulty walking. Surgery planned this admission.'
    },
    {
      id: 'PA-260167', member: 'Member •••• 1194', hospital: 'Greenview Medical',
      procedure: 'Appendectomy', diagnosis: 'K35.80 · Unspecified acute appendicitis',
      amount: 76000, received: '08:28 AM', minutesLeft: 0, urgency: 'Urgent', status: 'Approved',
      recommendation: 'Likely eligible', confidence: 93,
      summary: 'The submitted diagnosis, procedure and attached evidence align with the configured policy checks. This is a simulated recommendation for demonstration only.',
      signals: ['Procedure and diagnosis are consistent', 'Required documents are present'],
      missing: [],
      notes: 'Acute abdominal pain with clinical findings consistent with appendicitis.'
    },
    {
      id: 'PA-260155', member: 'Member •••• 7741', hospital: 'Sunrise Nursing Home',
      procedure: 'Cataract surgery', diagnosis: 'H25.9 · Age-related cataract, unspecified',
      amount: 42000, received: '08:19 AM', minutesLeft: 0, urgency: 'Standard', status: 'Declined',
      recommendation: 'Review required', confidence: 68,
      summary: 'This sample was declined after reviewer assessment. A real system would require a policy-grounded reason, evidence references and a clear appeal path.',
      signals: ['Policy eligibility requires verification'],
      missing: ['Policy eligibility confirmation'],
      notes: 'Cataract procedure requested. Clinical documents attached.'
    }
  ];

  get filteredClaims(): Claim[] {
    const term = this.searchText.trim().toLowerCase();
    return this.claims.filter(claim => {
      const matchesSearch = !term || [claim.id, claim.hospital, claim.procedure, claim.member].some(value => value.toLowerCase().includes(term));
      const matchesStatus = this.statusFilter === 'All statuses' || claim.status === this.statusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  get selectedClaim(): Claim {
    return this.claims.find(claim => claim.id === this.selectedClaimId) ?? this.claims[0];
  }

  get pendingCount(): number {
    return this.claims.filter(claim => claim.status === 'Needs review' || claim.status === 'More information').length;
  }

  get urgentCount(): number {
    return this.claims.filter(claim => claim.minutesLeft > 0 && claim.minutesLeft <= 5 && claim.status !== 'Approved' && claim.status !== 'Declined').length;
  }

  get reviewCount(): number {
    return this.claims.filter(claim => claim.status === 'Needs review').length;
  }

  selectClaim(claim: Claim): void {
    this.selectedClaimId = claim.id;
    this.reviewerNote = '';
    this.actionReason = '';
    this.toast = '';
  }

  setPage(page: string): void {
    this.activePage = page;
    this.toast = '';
  }

  takeAction(status: ClaimStatus): void {
    if (!this.actionReason.trim()) {
      this.toast = 'Add a short reason before recording this decision.';
      return;
    }
    this.selectedClaim.status = status;
    this.recordAuditEvent(status, this.actionReason.trim());
    this.toast = `${this.selectedClaim.id} marked as ${status.toLowerCase()}. Demo decision recorded locally.`;
    this.reviewerNote = `${status}: ${this.actionReason.trim()}`;
  }

  requestInformation(): void {
    if (!this.actionReason.trim()) {
      this.toast = 'Add the information you need from the hospital.';
      return;
    }
    this.selectedClaim.status = 'More information';
    this.selectedClaim.missing = [this.actionReason.trim()];
    this.recordAuditEvent('More information requested', this.actionReason.trim());
    this.toast = 'Information request recorded locally for this demo.';
  }

  private recordAuditEvent(action: string, reason: string): void {
    this.auditEvents.unshift({
      claimId: this.selectedClaim.id,
      hospital: this.selectedClaim.hospital,
      action,
      reason,
      time: new Date().toLocaleString('en-IN')
    });
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  }
}
