# Graph Report - .  (2026-07-15)

## Corpus Check
- 142 files · ~138,289 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 219 nodes · 36 edges · 191 communities (4 shown, 187 thin omitted)
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Flaship API Overview
- Project Configuration
- Flaship Booking & Labels
- Flaship Authentication
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 147
- Community 148
- Community 149
- Community 150
- Community 151
- Community 152
- Community 153
- Community 154
- Community 155
- Community 156
- Community 157
- Community 158
- Community 159
- Community 160
- Community 161
- Community 162
- Community 163
- Community 164
- Community 165
- Community 166
- Community 167
- Community 168
- Community 169
- Community 170
- Community 171
- Community 172
- Community 173
- Community 174
- Community 175
- Community 176
- Community 177
- Community 178
- Community 179
- Community 180
- Community 181
- Community 182
- Community 183
- Community 184
- Community 185
- Community 186
- Community 187
- Community 188
- Community 189
- Community 190

## God Nodes (most connected - your core abstractions)
1. `Flaship API` - 20 edges
2. `Next.js` - 5 edges
3. `Create Booking` - 4 edges
4. `Generate Loadsheet` - 3 edges
5. `Generate Label` - 3 edges
6. `Blink-n-Ship Service` - 3 edges
7. `Authentication` - 2 edges
8. `X-API-KEY` - 2 edges
9. `Bulk Booking` - 2 edges
10. `Order Detail` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Next.js Agent Rules` --references--> `Next.js`  [EXTRACTED]
  AGENTS.md → README.md
- `Blink-n-Ship Service` --conceptually_related_to--> `Next.js`  [INFERRED]
  render.yaml → README.md
- `Claude Config` --references--> `Next.js Agent Rules`  [EXTRACTED]
  CLAUDE.md → AGENTS.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Flaship API Endpoints** — _flaship_api_docs_extracted_txt_couriersratescities, _flaship_api_docs_extracted_txt_systemstatuses, _flaship_api_docs_extracted_txt_pickuplocations, _flaship_api_docs_extracted_txt_createpickuplocation, _flaship_api_docs_extracted_txt_ratecard, _flaship_api_docs_extracted_txt_createbooking, _flaship_api_docs_extracted_txt_bulkbooking, _flaship_api_docs_extracted_txt_listorders, _flaship_api_docs_extracted_txt_orderdetail, _flaship_api_docs_extracted_txt_trackorder, _flaship_api_docs_extracted_txt_cancelorder, _flaship_api_docs_extracted_txt_loadsheeteligibleorders, _flaship_api_docs_extracted_txt_generateloadsheet, _flaship_api_docs_extracted_txt_generatelabel [EXTRACTED 1.00]
- **Flaship Courier Companies** — _flaship_api_docs_extracted_txt_tcs, _flaship_api_docs_extracted_txt_leopard, _flaship_api_docs_extracted_txt_trax, _flaship_api_docs_extracted_txt_mnp [EXTRACTED 1.00]

## Communities (191 total, 187 thin omitted)

### Community 0 - "Flaship API Overview"
Cohesion: 0.15
Nodes (14): Couriers, Rates & Cities, Create Pickup Location, Flaship API, Leopard, List Orders, MNP, Order Detail, Pickup Locations (+6 more)

### Community 1 - "Project Configuration"
Cohesion: 0.22
Nodes (9): Next.js Agent Rules, Claude Config, create-next-app, Geist Font, Next.js, Vercel, Blink-n-Ship Service, Environment Variables (+1 more)

### Community 2 - "Flaship Booking & Labels"
Cohesion: 0.33
Nodes (6): Bulk Booking, Cancel Order, Create Booking, Generate Label, Generate Loadsheet, Loadsheet Eligible Orders

### Community 3 - "Flaship Authentication"
Cohesion: 0.67
Nodes (3): Authentication, API Key Security Rationale, X-API-KEY

## Knowledge Gaps
- **202 isolated node(s):** `POST`, `GET`, `POST`, `GET`, `PATCH` (+197 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **187 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Flaship API` connect `Flaship API Overview` to `Flaship Booking & Labels`, `Flaship Authentication`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `Authentication` connect `Flaship Authentication` to `Flaship API Overview`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `Create Booking` (e.g. with `Cancel Order` and `Bulk Booking`) actually correct?**
  _`Create Booking` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Generate Label` (e.g. with `Create Booking` and `Generate Loadsheet`) actually correct?**
  _`Generate Label` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `POST`, `GET`, `POST` to the rest of the system?**
  _202 weakly-connected nodes found - possible documentation gaps or missing edges._