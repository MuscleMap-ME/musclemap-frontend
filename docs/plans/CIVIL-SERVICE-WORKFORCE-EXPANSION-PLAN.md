# MuscleMap Civil Service & Workforce Readiness Expansion Plan

*Comprehensive Strategy for B2B and Government Procurement*

**Version:** 1.0
**Date:** January 14, 2026
**Status:** PROPOSED

---

## Executive Summary

MuscleMap has a **fully-implemented backend** for career readiness tracking with 20+ PT standards, team readiness dashboards, and recertification scheduling. This plan expands that foundation into a comprehensive **workforce readiness platform** targeting:

1. **All Civil Service Roles** - Beyond military/fire/police to EMS, corrections, parks, TSA, and more
2. **Blue Collar & Trade Professions** - Construction, CDL drivers, warehouse, utilities
3. **B2B Enterprise Sales** - Department/agency subscriptions
4. **Government Procurement** - GSA Schedule, state contracts, municipal purchasing

**Market Opportunity:**
- 2.8M+ state/local government employees in public safety roles
- 900K+ federal civilian employees
- 7M+ construction workers
- 3.5M+ professional drivers
- $4.2B fitness app market growing to $15.2B by 2028

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Expanded Career Standards Library](#2-expanded-career-standards-library)
3. [New Profession Categories](#3-new-profession-categories)
4. [B2B Product Architecture](#4-b2b-product-architecture)
5. [Government Procurement Strategy](#5-government-procurement-strategy)
6. [Integration Partnerships](#6-integration-partnerships)
7. [Pricing & Packaging](#7-pricing--packaging)
8. [Implementation Phases](#8-implementation-phases)
9. [Success Metrics](#9-success-metrics)

---

## 1. Current State Assessment

### What's Already Built

| Component | Status | Notes |
|-----------|--------|-------|
| Career standards database | ✅ Complete | 20+ standards defined |
| User career goals | ✅ Complete | Full CRUD + caching |
| Assessment logging | ✅ Complete | Practice/official/simulated |
| Readiness calculation | ✅ Complete | Per-event scoring |
| Team readiness API | ✅ Complete | Opt-in privacy model |
| Recertification scheduling | ✅ Complete | Automated reminders |
| Exercise mapping | ✅ Complete | 4+ exercises per event |
| REST API endpoints | ✅ Complete | 15+ endpoints |
| GraphQL exposure | ❌ Pending | Not yet in schema |
| Frontend UI | ❌ Pending | No React components |
| Mobile UI | ❌ Pending | No Expo screens |
| PDF/CSV exports | ❌ Pending | Spec complete |
| Background jobs | ❌ Pending | Specs in docs |

### Current Standards Covered

**Military (8):**
- Army ACFT, APFT
- Navy PRT
- Marine Corps PFT
- Air Force PT
- BUD/S PST (SEALs)
- Ranger RPAT
- Coast Guard PFT

**Firefighter (4):**
- CPAT (Generic)
- FDNY FSS
- LAFD PAT
- Chicago CPAT

**Law Enforcement (6):**
- FBI PFT
- DEA PFT
- Secret Service PFT
- Border Patrol PFT
- California POST
- State Corrections (Generic)

---

## 2. Expanded Career Standards Library

### EMS / Paramedic Standards (NEW)

| Standard ID | Name | Agency | Events | Source |
|------------|------|--------|--------|--------|
| `medic-mile` | Medic Mile | National Testing Network | 6 | [NTN](https://www.nationaltestingnetwork.com/publicsafetyjobs/medic_mile_info.cfm) |
| `sf-ems-pat` | SF Fire EMS PAT | San Francisco FD | 4 | [SF Fire](http://sf-fire.org/employment-opportunities/ems-physical-agility-test) |
| `chicago-ems` | Chicago EMS PAT | Chicago Fire | 5 | [Chicago](https://www.chicago.gov/city/en/depts/cfd/supp_info/CFDJobPrep.html) |
| `ems-generic` | Generic EMS PAT | Various | 4 | Industry Standard |

**Medic Mile Events:**
1. Stair climb with equipment (70 lbs)
2. Patient drag (165 lbs, 50 ft)
3. Gurney operations
4. Equipment carry (80 ft)
5. CPR simulation (2 min)
6. Balance/coordination test

**Exercise Mappings:**
- Stair climb → stair_climber, lunges, weighted_vest_walks
- Patient drag → sled_drag, goblet_squats, farmers_carry
- Gurney ops → deadlift, bent_over_rows
- CPR simulation → push_ups, tricep_dips, plank

---

### Corrections Officer Standards (NEW)

| Standard ID | Name | Agency | Events | Source |
|------------|------|--------|--------|--------|
| `copat` | COPAT | Generic Corrections | 4 | [Various](https://www.publicsafetytesting.com/information-center/test-requirements-corrections-physical-wa) |
| `cdcr-pft` | California CDCR PFT | CA Corrections | 5 | [CDCR](https://www.cdcr.ca.gov/por/pft-prep-guide-2/) |
| `ny-doccs` | NY DOCCS PAT | New York State | 4 | [NY DOCCS](https://www.publicsafetymedicine.org/correctional-officers/appendix-c) |
| `bop-pft` | Federal BOP PFT | Bureau of Prisons | 5 | [BOP](https://www.bop.gov/policy/progstat/3906.24.pdf) |
| `hawaii-copat` | Hawaii COPAT | Hawaii DCR | 6 | [Hawaii](https://dcr.hawaii.gov/wp-content/uploads/2025/09/Final-2025.08.28-F-Recruit_Fitness_Standards.pdf) |

**California CDCR PFT Events:**
1. 500-yard course run (varied surfaces + stairs)
2. Obstacle course elements
3. Physical confrontation simulation
4. Emergency response drill
5. Equipment carry

*Pass Standard: 5:35 or less*

---

### Park Ranger / Wildlife Officer Standards (NEW)

| Standard ID | Name | Agency | Events | Source |
|------------|------|--------|--------|--------|
| `nps-peb` | NPS Physical Efficiency Battery | National Park Service | 4 | [NPS](https://www.nps.gov/subjects/uspp/upload/2-22-19-peb-facts.pdf) |
| `wa-ranger` | WA State Parks Ranger PAT | Washington State | 5 | [WA Parks](https://parks.wa.gov/about/jobs/park-ranger-physical-ability-test) |
| `ca-ranger` | CA State Parks Ranger | California State | 5 | [CA Parks](https://joincsp.parks.ca.gov/?page_id=31526) |
| `usfs-leo` | USFS Law Enforcement | US Forest Service | 4 | Federal Standard |
| `blm-ranger` | BLM Ranger | Bureau of Land Management | 4 | Federal Standard |

**NPS Physical Efficiency Battery (PEB):**
1. 1.5 Mile Run (25th percentile or higher)
2. Illinois Agility Run
3. Bench Press (25th percentile)
4. Sit and Reach (flexibility)
5. Body Composition (informational)

*Annual recertification required for law enforcement rangers*

---

### TSA / Airport Security Standards (NEW)

| Standard ID | Name | Agency | Events | Source |
|------------|------|--------|--------|--------|
| `tsa-tso` | TSA Transportation Security Officer | TSA/DHS | 3 | [TSA](https://jobs.tsa.gov/federal-hiring-process) |
| `tsa-fam` | Federal Air Marshal | TSA/DHS | 5 | Federal Standard |

**TSA TSO Physical Requirements:**
1. Lift 50 lbs repeatedly without assistance
2. Stand/walk for extended periods (4+ hours)
3. Color vision test
4. Hearing test (whisper at 5 ft)

*Medical evaluation rather than timed fitness test*

---

### Lifeguard / Aquatic Safety Standards (NEW)

| Standard ID | Name | Agency | Events | Source |
|------------|------|--------|--------|--------|
| `arc-lifeguard` | American Red Cross Lifeguard | Red Cross | 4 | [Red Cross](https://www.redcross.org/take-a-class/lifeguarding) |
| `ymca-lifeguard` | YMCA Lifeguard Certification | YMCA | 5 | [YMCA](https://ymcanyc.org/ymca-lifeguard-training-certification) |
| `usla-ocean` | USLA Open Water Lifeguard | US Lifesaving Assoc | 6 | USLA Standard |
| `pool-generic` | Generic Pool Lifeguard | Various | 4 | Industry Standard |

**American Red Cross Lifeguard Prerequisites (r.24):**
1. 200-yard swim (150yd crawl/breaststroke + tread 2 min + 50yd backstroke)
2. Timed brick retrieval (1:40 limit)
   - Swim 20 yards
   - Surface dive to 7-10 ft depth
   - Retrieve 10-lb object
   - Swim 20 yards on back with object
3. Treading water 2 minutes (hands above water)

*Certification valid 2 years*

---

### Trade & Construction Standards (NEW)

| Standard ID | Name | Agency | Events | Source |
|------------|------|--------|--------|--------|
| `ibew-pat` | IBEW Electrician Apprentice | IBEW Union | 4 | Union Standard |
| `ua-plumber` | UA Plumber/Pipefitter | UA Union | 4 | Union Standard |
| `ironworker-pat` | Ironworkers PAT | Ironworkers Union | 5 | [Union](https://www.buildersguild.org/index.php/union-apprenticeships/apprenticeships) |
| `laborer-cpat` | Laborers CPAT | LIUNA | 5 | [LIUNA](https://www.laborerstrainingschool.com/apprenticeship) |
| `carpenter-pat` | Carpenter Apprentice | UBC | 4 | Union Standard |

**Ironworkers Physical Ability Test:**
1. Climb 60-foot ladder with tools
2. Carry 50-lb beam 100 feet
3. Balance walk on 4-inch beam
4. Grip strength test
5. Endurance circuit (15 minutes)

---

### Commercial Driver / DOT Standards (NEW)

| Standard ID | Name | Agency | Events | Source |
|------------|------|--------|--------|--------|
| `dot-physical` | DOT Physical Exam | FMCSA | 8 | [FMCSA](https://www.fmcsa.dot.gov/medical/driver-medical-requirements/dot-medical-exam-and-commercial-motor-vehicle-certification) |
| `cdl-hazmat` | CDL HazMat Endorsement | FMCSA | 9 | Federal Standard |

**DOT Physical Requirements:**
1. Vision: 20/40 in each eye (with/without correction)
2. Hearing: Forced whisper at 5 feet
3. Blood pressure: <140/90 for 2-year cert
4. Urinalysis: No diabetes indicators
5. Physical exam: Hernia, reflexes, balance
6. Medical history review
7. Sleep apnea screening
8. Color vision (signal recognition)

*Certificate valid 24 months; June 2025 electronic submission changes*

---

### Other Civil Service Standards (NEW)

| Standard ID | Name | Agency | Events |
|------------|------|--------|--------|
| `usps-carrier` | USPS Mail Carrier | USPS | 3 |
| `sanitation-pat` | Sanitation Worker PAT | Various Cities | 4 |
| `transit-operator` | Transit Operator | Various Cities | 3 |
| `911-dispatcher` | 911 Dispatcher | Various | 2 |
| `animal-control` | Animal Control Officer | Various | 4 |
| `code-enforcement` | Code Enforcement | Various | 2 |
| `public-works` | Public Works | Various | 3 |
| `utility-lineworker` | Utility Lineworker | Various | 5 |

---

## 3. New Profession Categories

### Updated Category Taxonomy

```
career_standards.category VALUES:

FIRST_RESPONDERS:
├── firefighter
├── ems_paramedic (NEW)
├── lifeguard (NEW)
├── search_and_rescue

LAW_ENFORCEMENT:
├── federal_agent
├── state_police
├── local_police
├── corrections (NEW)
├── park_ranger (NEW)
├── campus_police (NEW)

MILITARY:
├── army
├── navy
├── air_force
├── marines
├── coast_guard
├── space_force (NEW)
├── national_guard (NEW)

SPECIAL_OPERATIONS:
├── seals
├── rangers
├── special_forces
├── marsoc
├── pararescue (NEW)
├── combat_control (NEW)

TRANSPORTATION:
├── commercial_driver (NEW)
├── transit_operator (NEW)
├── airline_crew (NEW)
├── tsa_security (NEW)

TRADES:
├── construction (NEW)
├── electrical (NEW)
├── plumbing (NEW)
├── ironwork (NEW)
├── hvac (NEW)
├── linework (NEW)

PUBLIC_SERVICE:
├── postal_service (NEW)
├── sanitation (NEW)
├── public_works (NEW)
├── animal_control (NEW)

HEALTHCARE:
├── nursing (NEW)
├── surgical_tech (NEW)
├── physical_therapy (NEW)
```

---

## 4. B2B Product Architecture

### Enterprise Features

#### Department Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│ Chicago Fire Department - Enterprise Dashboard                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Overall Readiness: 82.4%    ▲ +3.2% from last month           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Stations                    Readiness  │  Compliance    │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Station 1 - Downtown       94.2%       │  100%          │   │
│  │ Station 5 - Northside      78.2%       │  87.5%         │   │
│  │ Station 12 - Southside     71.8%       │  75.0%         │   │
│  │ Station 18 - West Loop     88.5%       │  92.3%         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Department-Wide Weak Areas:                                    │
│  1. Ladder Operations (23 members below standard)              │
│  2. Stair Climb Endurance (18 members)                         │
│  3. Equipment Carry (12 members)                               │
│                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────┐      │
│  │   Schedule Dept. PT     │  │   Export Full Report    │      │
│  └─────────────────────────┘  └─────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Hierarchy Support

```typescript
// Organization hierarchy
interface Organization {
  id: string;
  name: string;                    // "Chicago Fire Department"
  type: 'department' | 'agency' | 'company' | 'district';
  parent_org_id?: string;          // For sub-organizations
  standards: string[];             // ["cpat", "emt-basic"]
  settings: {
    require_compliance: boolean;
    compliance_threshold: number;  // 80%
    recert_grace_period_days: number;
    auto_assign_workouts: boolean;
  };
}

// Unit within organization
interface OrganizationUnit {
  id: string;
  org_id: string;
  name: string;                    // "Station 5"
  type: 'station' | 'precinct' | 'platoon' | 'shift' | 'team';
  supervisor_ids: string[];
  member_count: number;
}

// Membership
interface OrganizationMembership {
  user_id: string;
  org_id: string;
  unit_id: string;
  role: 'member' | 'supervisor' | 'admin' | 'chief';
  badge_number?: string;
  hire_date?: Date;
  rank?: string;
}
```

#### Enterprise API Endpoints

```typescript
// Organization Management
POST   /api/v1/organizations                    // Create org
GET    /api/v1/organizations/:orgId             // Get org details
PUT    /api/v1/organizations/:orgId             // Update org
GET    /api/v1/organizations/:orgId/units       // List units
POST   /api/v1/organizations/:orgId/units       // Create unit
GET    /api/v1/organizations/:orgId/members     // List all members
POST   /api/v1/organizations/:orgId/invite      // Invite member

// Enterprise Readiness
GET    /api/v1/organizations/:orgId/readiness   // Org-wide readiness
GET    /api/v1/organizations/:orgId/readiness/units  // By-unit breakdown
GET    /api/v1/organizations/:orgId/readiness/trends // Historical
GET    /api/v1/organizations/:orgId/compliance  // Compliance status
POST   /api/v1/organizations/:orgId/readiness/export // Generate report

// Bulk Operations
POST   /api/v1/organizations/:orgId/assessments/bulk  // Bulk assessment
POST   /api/v1/organizations/:orgId/goals/bulk        // Bulk goal setting
POST   /api/v1/organizations/:orgId/workouts/assign   // Assign workouts

// Analytics
GET    /api/v1/organizations/:orgId/analytics/overview
GET    /api/v1/organizations/:orgId/analytics/weak-areas
GET    /api/v1/organizations/:orgId/analytics/improvement
GET    /api/v1/organizations/:orgId/analytics/benchmarks
```

#### SSO / Identity Integration

```typescript
// SAML 2.0 / OAuth 2.0 integration
interface SSOConfig {
  org_id: string;
  provider: 'okta' | 'azure_ad' | 'google' | 'onelogin' | 'custom';
  metadata_url?: string;
  client_id: string;
  client_secret: string;
  attribute_mapping: {
    email: string;
    first_name: string;
    last_name: string;
    badge_number?: string;
    unit?: string;
    rank?: string;
  };
  auto_provision: boolean;
  require_sso: boolean;
}
```

#### Compliance Reporting

```typescript
interface ComplianceReport {
  org_id: string;
  generated_at: Date;
  period: { start: Date; end: Date };

  summary: {
    total_members: number;
    compliant_members: number;
    compliance_rate: number;
    improvement_from_last_period: number;
  };

  by_standard: {
    standard_id: string;
    required_by: number;
    passed: number;
    failed: number;
    pending_assessment: number;
    overdue_recert: number;
  }[];

  by_unit: {
    unit_id: string;
    unit_name: string;
    compliance_rate: number;
    members_needing_attention: string[];
  }[];

  action_items: {
    priority: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    affected_members: string[];
    recommended_action: string;
  }[];
}
```

---

## 5. Government Procurement Strategy

### GSA Schedule Pathway

**Target Schedule:** MAS (Multiple Award Schedule) - Category: Professional Services / Training

**Timeline:** 12-18 months from application

**Steps:**
1. Complete SAM.gov registration (2-4 weeks)
2. Complete Pathways to Success training (4 hours) - [GSA Training](https://www.gsa.gov/about-us/events-training-and-request-a-speaker/our-training-programs/training-for-vendors/how-to-get-on-schedule)
3. Obtain FedRAMP authorization if cloud-based
4. Submit GSA Schedule offer via eBuy
5. Negotiate pricing with GSA contracting officer
6. Receive GSA Schedule contract number

**Benefits of GSA Schedule:**
- Pre-negotiated pricing accepted by all federal agencies
- Streamlined procurement for agencies (no separate RFP needed)
- Access to 125+ federal agencies
- Listed in GSA Advantage marketplace

### State & Local Procurement

**Cooperative Purchasing Agreements:**

| Agreement | Coverage | Entities |
|-----------|----------|----------|
| NASPO ValuePoint | All 50 states | State/local governments |
| Sourcewell | National | 50,000+ government entities |
| OMNIA Partners | National | Public sector purchasing |
| TIPS-USA | National | Education/government |

**State-Specific Contracts:**

| State | Contract Vehicle | Target Agencies |
|-------|------------------|-----------------|
| California | Cal eProcure | CDCR, CHP, CalFire |
| Texas | DIR | TDCJ, DPS |
| New York | OGS | DOCCS, NYPD, FDNY |
| Florida | DMS | DOC, FHP |
| Illinois | CMS | DOC, ISP |

### Compliance Requirements

**Security & Privacy:**
- FedRAMP Moderate (federal cloud)
- StateRAMP (state cloud)
- SOC 2 Type II
- CJIS compliance (law enforcement)
- HIPAA (if health data)

**Accessibility:**
- Section 508 compliance
- WCAG 2.1 AA

**Data Residency:**
- US-only data centers
- State-specific requirements (CA, TX)

### Procurement Documentation Needed

1. **Capability Statement** - 2-page summary for contracting officers
2. **Past Performance** - 3 references (can start with commercial)
3. **Pricing Schedule** - Per-seat or enterprise pricing
4. **Technical Specifications** - Architecture, security, integrations
5. **Implementation Plan** - Deployment, training, support
6. **Compliance Matrix** - Checklist of regulatory requirements

---

## 6. Integration Partnerships

### HR & Personnel Systems

| System | Type | Integration Method |
|--------|------|-------------------|
| Workday | Enterprise HR | REST API |
| ADP | Payroll/HR | API + SFTP |
| UKG (Kronos) | Workforce Mgmt | REST API |
| SAP SuccessFactors | Enterprise HR | OData API |
| Oracle HCM | Enterprise HR | REST API |
| Tyler Technologies | Public Sector | API + Flat File |
| NEOGOV | Government HR | REST API |
| CentralSquare | Public Safety | API |

### Training & LMS Platforms

| Platform | Use Case | Integration |
|----------|----------|-------------|
| Cornerstone | Enterprise LMS | LTI + API |
| Blackboard | Education | LTI |
| Canvas | Education | LTI + REST |
| Target Solutions | Public Safety | API |
| Vector Solutions | First Responders | API |
| Lexipol | Law Enforcement | API |
| Jones & Bartlett | EMS Training | Partnership |

### Scheduling & Dispatch

| System | Sector | Integration |
|--------|--------|-------------|
| Kronos | General | API |
| Telestaff | Fire/EMS | API |
| Vector Scheduling | Public Safety | API |
| ESO | EMS | HL7/FHIR |
| ImageTrend | Fire/EMS | API |

### Wearables & Fitness Devices

| Device/Platform | Data Available | Integration |
|-----------------|----------------|-------------|
| Garmin Connect | HR, GPS, activity | API |
| Apple Health | All health metrics | HealthKit |
| Google Fit | Activity, vitals | API |
| WHOOP | HRV, recovery, strain | API |
| Oura | Sleep, readiness | API |
| Polar Flow | HR, training load | API |
| Firstbeat | HRV analytics | API |

### Data Export Standards

```typescript
// NEMSIS (EMS Data Standard)
interface NEMSISExport {
  format: 'NEMSIS v3.5';
  data: {
    provider_id: string;
    fitness_assessments: Assessment[];
    readiness_scores: ReadinessScore[];
  };
}

// NFIRS (Fire Incident Reporting)
interface NFIRSIntegration {
  department_id: string;
  personnel_fitness_data: boolean;
  link_to_incidents: boolean;
}

// CJIS (Criminal Justice)
interface CJISCompliance {
  encryption: 'AES-256';
  access_logging: boolean;
  background_checks: boolean;
  data_at_rest_encryption: boolean;
}
```

---

## 7. Pricing & Packaging

### Individual Plans (B2C)

| Tier | Price | Features |
|------|-------|----------|
| Free | $0/mo | 1 career goal, basic readiness, 3 assessments/mo |
| Pro | $9.99/mo | Unlimited goals, full readiness, prescriptions |
| Elite | $19.99/mo | + Coaching AI, advanced analytics, priority support |

### Team Plans (Small B2B)

| Tier | Price | Users | Features |
|------|-------|-------|----------|
| Team | $7.99/user/mo | 5-25 | Team dashboard, 1 admin |
| Station | $5.99/user/mo | 26-100 | + Multi-admin, exports |
| Department | $4.99/user/mo | 101-500 | + SSO, API access |

### Enterprise Plans (Large B2B / Government)

| Tier | Price | Users | Features |
|------|-------|-------|----------|
| Enterprise | Custom | 500+ | Full platform, dedicated support |
| Government | Custom | Any | FedRAMP, CJIS, compliance |
| Consortium | Custom | Multi-org | Shared instance, benchmarking |

**Enterprise Add-Ons:**
- Custom integrations: $10,000 setup + $500/mo
- Dedicated instance: $2,500/mo
- 24/7 support: $1,500/mo
- Custom reporting: $5,000 setup
- On-site training: $2,500/day
- API overage: $0.01/request after 100K/mo

### Government Pricing (GSA Schedule)

| SKU | Description | Price |
|-----|-------------|-------|
| MM-GOV-100 | Up to 100 users, annual | $4,500/year |
| MM-GOV-500 | Up to 500 users, annual | $18,000/year |
| MM-GOV-1000 | Up to 1,000 users, annual | $30,000/year |
| MM-GOV-UNL | Unlimited users, annual | $50,000/year |
| MM-IMP-STD | Standard implementation | $5,000 |
| MM-IMP-ENT | Enterprise implementation | $15,000 |
| MM-TRAIN-DAY | On-site training (per day) | $2,000 |
| MM-SUPP-PREM | Premium support (annual) | $10,000 |

---

## 8. Implementation Phases

### Phase 1: Foundation (Weeks 1-8)

**Goal:** Complete frontend UI and expose GraphQL API

| Task | Owner | Duration |
|------|-------|----------|
| Career goal selection UI (web) | Frontend | 2 weeks |
| Readiness dashboard UI (web) | Frontend | 2 weeks |
| Assessment logger UI (web) | Frontend | 1 week |
| GraphQL schema for career | Backend | 1 week |
| Team readiness dashboard | Frontend | 2 weeks |

**Deliverables:**
- [ ] Career readiness page at `/career`
- [ ] Goal selection wizard
- [ ] Readiness dashboard with charts
- [ ] Assessment logging modal
- [ ] Team readiness for hangout admins
- [ ] GraphQL queries/mutations for career

### Phase 2: Expanded Standards (Weeks 9-16)

**Goal:** Add 50+ new career standards

| Task | Owner | Duration |
|------|-------|----------|
| EMS/Paramedic standards (6) | Content | 2 weeks |
| Corrections standards (5) | Content | 2 weeks |
| Park Ranger standards (5) | Content | 1 week |
| Trade/Construction standards (10) | Content | 2 weeks |
| Lifeguard standards (4) | Content | 1 week |
| DOT/Transportation standards (5) | Content | 1 week |
| Remaining civil service (15) | Content | 2 weeks |
| Exercise mapping for all | Content | Ongoing |

**Deliverables:**
- [ ] 50+ new standards in database
- [ ] All events mapped to exercises
- [ ] Category taxonomy updated
- [ ] E2E tests for new standards

### Phase 3: Enterprise Features (Weeks 17-28)

**Goal:** B2B-ready platform

| Task | Owner | Duration |
|------|-------|----------|
| Organization/unit data model | Backend | 2 weeks |
| Enterprise dashboard UI | Frontend | 3 weeks |
| SSO integration (SAML/OAuth) | Backend | 2 weeks |
| Compliance reporting engine | Backend | 2 weeks |
| PDF/CSV export generation | Backend | 1 week |
| Bulk operations API | Backend | 1 week |
| Admin console | Frontend | 2 weeks |

**Deliverables:**
- [ ] Multi-tenant organization support
- [ ] Enterprise admin console
- [ ] SSO with Okta, Azure AD
- [ ] Automated compliance reports
- [ ] Export to PDF, CSV, Excel
- [ ] Bulk user import/management

### Phase 4: Integrations (Weeks 29-40)

**Goal:** Connect with existing systems

| Task | Owner | Duration |
|------|-------|----------|
| Garmin Connect integration | Backend | 2 weeks |
| Apple Health / HealthKit | Mobile | 2 weeks |
| WHOOP integration | Backend | 1 week |
| NEOGOV integration | Backend | 2 weeks |
| Vector Solutions / Target | Backend | 2 weeks |
| Webhook system | Backend | 1 week |
| Integration marketplace UI | Frontend | 2 weeks |

**Deliverables:**
- [ ] 5+ wearable integrations
- [ ] 3+ HR system integrations
- [ ] 2+ LMS integrations
- [ ] Webhook notifications
- [ ] Integration settings UI

### Phase 5: Government Readiness (Weeks 41-52)

**Goal:** Achieve procurement readiness

| Task | Owner | Duration |
|------|-------|----------|
| FedRAMP authorization | Security | 12 weeks |
| SOC 2 Type II audit | Security | 8 weeks |
| Section 508 compliance | Frontend | 4 weeks |
| CJIS compliance review | Security | 4 weeks |
| GSA Schedule application | Business | 8 weeks |
| State contract applications | Business | Ongoing |

**Deliverables:**
- [ ] FedRAMP Moderate authorization
- [ ] SOC 2 Type II report
- [ ] VPAT (accessibility)
- [ ] GSA Schedule contract number
- [ ] 3+ state contract vehicles

---

## 9. Success Metrics

### Phase 1 Metrics (Month 2)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Career page visitors | 1,000 | Analytics |
| Career goals set | 500 | Database |
| Assessments logged | 1,000 | Database |
| Team readiness enabled | 10 hangouts | Database |

### Phase 2 Metrics (Month 4)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Standards coverage | 70 standards | Database |
| Category diversity | 8 categories | Database |
| User retention (career) | 40% 30-day | Analytics |
| NPS (career users) | 50+ | Survey |

### Phase 3 Metrics (Month 7)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Enterprise accounts | 10 | CRM |
| Paid B2B seats | 500 | Billing |
| Enterprise MRR | $5,000 | Billing |
| Implementation success | 90% | Support |

### Phase 4 Metrics (Month 10)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Integration usage | 30% of users | Analytics |
| Wearable connections | 1,000 | Database |
| API requests | 100K/month | Metrics |
| Partner revenue | $2,000/mo | Billing |

### Phase 5 Metrics (Month 12)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Government contracts | 3 | Legal |
| Government seats | 1,000 | Billing |
| Government revenue | $50,000 | Billing |
| Compliance certifications | 4 | Legal |

### North Star Metrics (Year 1)

| Metric | Target |
|--------|--------|
| Total career users | 10,000 |
| B2B customers | 50 |
| B2B ARR | $200,000 |
| Government ARR | $100,000 |
| Total ARR | $500,000 |

---

## Appendices

### A. Competitive Landscape

| Competitor | Strengths | Weaknesses | MuscleMap Advantage |
|------------|-----------|------------|---------------------|
| CPAT Trainer | Fire-focused | Single standard | 70+ standards |
| Military Athlete | Military-focused | No team features | Team dashboards |
| O2X | First responders | Expensive | 10x cheaper |
| Stew Smith | Content | No software | Full platform |
| Firefighter Functional Fitness | Workouts | No readiness | Readiness scores |

### B. Regulatory Compliance Checklist

- [ ] FedRAMP Moderate (federal cloud requirement)
- [ ] StateRAMP (state cloud requirement)
- [ ] SOC 2 Type II (enterprise trust)
- [ ] HIPAA (if storing health data)
- [ ] CJIS (law enforcement data)
- [ ] Section 508 (federal accessibility)
- [ ] WCAG 2.1 AA (web accessibility)
- [ ] GDPR (if EU users)
- [ ] CCPA (California privacy)

### C. Key Contacts for Partnerships

**Government:**
- GSA Schedule helpdesk: mas@gsa.gov
- FedRAMP PMO: info@fedramp.gov

**Associations:**
- IAFF (Firefighters): partnership@iaff.org
- FOP (Police): membership@fop.net
- NAEMT (EMS): info@naemt.org

**Technology Partners:**
- Garmin Developer: developer@garmin.com
- WHOOP API: api@whoop.com

---

## Sources

- [National Testing Network - Medic Mile](https://www.nationaltestingnetwork.com/publicsafetyjobs/medic_mile_info.cfm)
- [San Francisco Fire EMS PAT](http://sf-fire.org/employment-opportunities/ems-physical-agility-test)
- [California CDCR PFT Guide](https://www.cdcr.ca.gov/por/pft-prep-guide-2/)
- [NPS Physical Efficiency Battery](https://www.nps.gov/subjects/uspp/upload/2-22-19-peb-facts.pdf)
- [GSA Schedule Information](https://www.gsa.gov/buy-through-us/purchasing-programs/multiple-award-schedule)
- [TSA Hiring Process](https://jobs.tsa.gov/federal-hiring-process)
- [FMCSA DOT Physical Requirements](https://www.fmcsa.dot.gov/medical/driver-medical-requirements/dot-medical-exam-and-commercial-motor-vehicle-certification)
- [Red Cross Lifeguard Training](https://ymcanyc.org/ymca-lifeguard-training-certification)
- [Laborers Training School](https://www.laborerstrainingschool.com/apprenticeship)
- [Bureau of Prisons Physical Standards](https://www.bop.gov/policy/progstat/3906.24.pdf)

---

*End of Civil Service & Workforce Readiness Expansion Plan*
