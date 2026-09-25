# Implement evidence — spec-0018

## Objective

Verify the control core's routing and feature-plan transitions, one ledger row at a time. The first row checks that a new capability opens one CREATE question before an SDD work order. The second checks that a proceeded feature plan reaches verify without opening another CREATE question.

## Items processed

| TDD-ID | TC-Refs | Status at this record |
| ------ | ------- | --------------------- |
| TDD-0001 | TC-0018-0001 | Done after both reviews and the completion gate passed |
| TDD-0002 | TC-0018-0002 | Done gate PASS (12/12); Round 2 reviews and checkpoint sealed |
| TDD-0003 | TC-0018-0003 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0004 | TC-0018-0004 | Done gate PASS (12/12); Round 1 reviews and checkpoint sealed |
| TDD-0005 | TC-0018-0005 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0006 | TC-0018-0006 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0007 | TC-0018-0006 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0008 | TC-0018-0006 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0009 | TC-0018-0006 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0010 | TC-0018-0006 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0011 | TC-0018-0006 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0012 | TC-0018-0007 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0013 | TC-0018-0008 | Done gate PASS (12/12); Round 1 reviews and checkpoint sealed |
| TDD-0014 | TC-0018-0010 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0015 | TC-0018-0012 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0016 | TC-0018-0012 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0017 | TC-0018-0012 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0018 | TC-0018-0012 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0019 | TC-0018-0012 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0020 | TC-0018-0012 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0021 | TC-0018-0012 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0022 | TC-0018-0012 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0023 | TC-0018-0013 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0024 | TC-0018-0014 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0025 | TC-0018-0015 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0026 | TC-0018-0016 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0027 | TC-0018-0016 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0028 | TC-0018-0016 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0029 | TC-0018-0016 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0030 | TC-0018-0016 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0031 | TC-0018-0018 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0032 | TC-0018-0021 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0033 | TC-0018-0022 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0034 | TC-0018-0023 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0035 | TC-0018-0031 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0036 | TC-0018-0033 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0037 | TC-0018-0034 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0038 | TC-0018-0035 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0039 | TC-0018-0035 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0040 | TC-0018-0035 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0041 | TC-0018-0035 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0042 | TC-0018-0035 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0043 | TC-0018-0035 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0044 | TC-0018-0035 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0045 | TC-0018-0035 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0046 | TC-0018-0035 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0047 | TC-0018-0035 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0048 | TC-0018-0035 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0049 | TC-0018-0035 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0050 | TC-0018-0036 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0051 | TC-0018-0037 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0052 | TC-0018-0038 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0053 | TC-0018-0040 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0054 | TC-0018-0041 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0055 | TC-0018-0043 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0056 | TC-0018-0044 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0057 | TC-0018-0045 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0058 | TC-0018-0046 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0059 | TC-0018-0047 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0060 | TC-0018-0048 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0061 | TC-0018-0048 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0062 | TC-0018-0048 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0063 | TC-0018-0048 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0064 | TC-0018-0049 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0065 | TC-0018-0051 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0066 | TC-0018-0052 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0067 | TC-0018-0053 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0068 | TC-0018-0053 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0069 | TC-0018-0053 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0070 | TC-0018-0053 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0071 | TC-0018-0053 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0072 | TC-0018-0054 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0073 | TC-0018-0055 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0074 | TC-0018-0057 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0075 | TC-0018-0057 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0076 | TC-0018-0058 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0077 | TC-0018-0059 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0078 | TC-0018-0060 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0079 | TC-0018-0062 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0080 | TC-0018-0062 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0081 | TC-0018-0063 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0082 | TC-0018-0064 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0083 | TC-0018-0066 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0084 | TC-0018-0067 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0085 | TC-0018-0068 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0086 | TC-0018-0069 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0087 | TC-0018-0069 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0088 | TC-0018-0073 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0089 | TC-0018-0074 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0090 | TC-0018-0076 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0091 | TC-0018-0077 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0092 | TC-0018-0077 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0093 | TC-0018-0077 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0094 | TC-0018-0077 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0095 | TC-0018-0077 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0096 | TC-0018-0077 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0097 | TC-0018-0078 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0098 | TC-0018-0079 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0099 | TC-0018-0080 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0100 | TC-0018-0081 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0101 | TC-0018-0082 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0102 | TC-0018-0083 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0103 | TC-0018-0083 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0104 | TC-0018-0084 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0105 | TC-0018-0084 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0106 | TC-0018-0084 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0107 | TC-0018-0084 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0108 | TC-0018-0084 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0109 | TC-0018-0084 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0110 | TC-0018-0084 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0111 | TC-0018-0085 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0112 | TC-0018-0086 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0113 | TC-0018-0086 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0114 | TC-0018-0086 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0115 | TC-0018-0086 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0116 | TC-0018-0086 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0117 | TC-0018-0086 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0118 | TC-0018-0087 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0119 | TC-0018-0087 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0120 | TC-0018-0088 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0121 | TC-0018-0088 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0122 | TC-0018-0088 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0123 | TC-0018-0089 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0124 | TC-0018-0090 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0125 | TC-0018-0090 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0126 | TC-0018-0090 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0127 | TC-0018-0090 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0128 | TC-0018-0090 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0129 | TC-0018-0091 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0130 | TC-0018-0092 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0131 | TC-0018-0093 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0132 | TC-0018-0095 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0133 | TC-0018-0096 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0134 | TC-0018-0097 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0135 | TC-0018-0098 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0136 | TC-0018-0098 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0137 | TC-0018-0098 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0138 | TC-0018-0098 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0139 | TC-0018-0099 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0140 | TC-0018-0100 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0141 | TC-0018-0101 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0142 | TC-0018-0101 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0143 | TC-0018-0101 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0144 | TC-0018-0105 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0145 | TC-0018-0109 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0146 | TC-0018-0122 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0147 | TC-0018-0122 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0148 | TC-0018-0122 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0149 | TC-0018-0135 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0150 | TC-0018-0135 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0151 | TC-0018-0135 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0152 | TC-0018-0135 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0153 | TC-0018-0135 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0154 | TC-0018-0135 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0155 | TC-0018-0135 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0156 | TC-0018-0136 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0157 | TC-0018-0137 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0158 | TC-0018-0137 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0159 | TC-0018-0137 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0160 | TC-0018-0137 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0161 | TC-0018-0137 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0162 | TC-0018-0140 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0163 | TC-0018-0141 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0164 | TC-0018-0141 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0165 | TC-0018-0141 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0166 | TC-0018-0141 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0167 | TC-0018-0141 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0168 | TC-0018-0141 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0169 | TC-0018-0141 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0170 | TC-0018-0141 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0171 | TC-0018-0141 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0172 | TC-0018-0141 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0173 | TC-0018-0141 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0174 | TC-0018-0141 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0175 | TC-0018-0141 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0176 | TC-0018-0141 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0177 | TC-0018-0141 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0178 | TC-0018-0141 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0179 | TC-0018-0141 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0180 | TC-0018-0142 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0181 | TC-0018-0142 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0182 | TC-0018-0142 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0183 | TC-0018-0142 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0184 | TC-0018-0143 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0185 | TC-0018-0143 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0186 | TC-0018-0143 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0187 | TC-0018-0144 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0188 | TC-0018-0144 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0189 | TC-0018-0145 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0190 | TC-0018-0145 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0191 | TC-0018-0146 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0192 | TC-0018-0146 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0193 | TC-0018-0146 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0194 | TC-0018-0147 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0195 | TC-0018-0147 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0196 | TC-0018-0147 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0197 | TC-0018-0148 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0198 | TC-0018-0148 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0199 | TC-0018-0148 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0200 | TC-0018-0148 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0201 | TC-0018-0149 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0202 | TC-0018-0149 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0203 | TC-0018-0149 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0204 | TC-0018-0150 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0205 | TC-0018-0151 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0206 | TC-0018-0152 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0207 | TC-0018-0153 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0208 | TC-0018-0154 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0209 | TC-0018-0155 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0210 | TC-0018-0156 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0211 | TC-0018-0156 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0212 | TC-0018-0158 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0213 | TC-0018-0158 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0214 | TC-0018-0158 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0215 | TC-0018-0158 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0216 | TC-0018-0158 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0217 | TC-0018-0158 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0218 | TC-0018-0165 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0219 | TC-0018-0172 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0220 | TC-0018-0172 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0221 | TC-0018-0172 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0222 | TC-0018-0172 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0223 | TC-0018-0180 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0224 | TC-0018-0180 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0225 | TC-0018-0180 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0226 | TC-0018-0180 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0227 | TC-0018-0181 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0228 | TC-0018-0187 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0229 | TC-0018-0187 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0230 | TC-0018-0187 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0231 | TC-0018-0187 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0232 | TC-0018-0187 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0233 | TC-0018-0187 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0234 | TC-0018-0187 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0235 | TC-0018-0187 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0236 | TC-0018-0187 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0237 | TC-0018-0187 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0238 | TC-0018-0188 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0239 | TC-0018-0188 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0240 | TC-0018-0190 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0241 | TC-0018-0195 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0242 | TC-0018-0211 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0243 | TC-0018-0213 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0244 | TC-0018-0213 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0245 | TC-0018-0213 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0246 | TC-0018-0213 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0247 | TC-0018-0213 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0248 | TC-0018-0213 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0249 | TC-0018-0214 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0250 | TC-0018-0215 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0251 | TC-0018-0216 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0252 | TC-0018-0217 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0253 | TC-0018-0223 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0254 | TC-0018-0223 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0255 | TC-0018-0223 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0256 | TC-0018-0223 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0257 | TC-0018-0223 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0258 | TC-0018-0224 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0259 | TC-0018-0225 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0261 | TC-0018-0011 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0263 | TC-0018-0019 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0264 | TC-0018-0020 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0265 | TC-0018-0020 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0266 | TC-0018-0020 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0267 | TC-0018-0020 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0268 | TC-0018-0024 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0315 | TC-0018-0094 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0355 | TC-0018-0139 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0356 | TC-0018-0157 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0365 | TC-0018-0164 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0366 | TC-0018-0166 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0371 | TC-0018-0168 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0374 | TC-0018-0170 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0389 | TC-0018-0183 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0390 | TC-0018-0184 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0391 | TC-0018-0184 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0392 | TC-0018-0184 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0393 | TC-0018-0184 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0394 | TC-0018-0184 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0395 | TC-0018-0184 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0396 | TC-0018-0184 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0397 | TC-0018-0184 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0398 | TC-0018-0184 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0399 | TC-0018-0184 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0400 | TC-0018-0185 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0401 | TC-0018-0185 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0402 | TC-0018-0185 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0403 | TC-0018-0185 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0404 | TC-0018-0185 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0405 | TC-0018-0185 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0406 | TC-0018-0186 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0407 | TC-0018-0186 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0429 | TC-0018-0218 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0430 | TC-0018-0218 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0431 | TC-0018-0218 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0432 | TC-0018-0218 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0433 | TC-0018-0218 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0434 | TC-0018-0219 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0435 | TC-0018-0219 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0436 | TC-0018-0219 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0437 | TC-0018-0219 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0438 | TC-0018-0219 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0439 | TC-0018-0219 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0446 | TC-0018-0229 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0465 | TC-0018-0238 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0466 | TC-0018-0239 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0467 | TC-0018-0239 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0468 | TC-0018-0240 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0469 | TC-0018-0240 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0470 | TC-0018-0241 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0479 | TC-0018-0246 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0480 | TC-0018-0247 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0481 | TC-0018-0248 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0482 | TC-0018-0249 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0483 | TC-0018-0249 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0484 | TC-0018-0249 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0485 | TC-0018-0250 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0486 | TC-0018-0250 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0487 | TC-0018-0250 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0488 | TC-0018-0250 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0489 | TC-0018-0250 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0490 | TC-0018-0250 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0491 | TC-0018-0250 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0492 | TC-0018-0250 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0493 | TC-0018-0250 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0494 | TC-0018-0250 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0495 | TC-0018-0250 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0496 | TC-0018-0250 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0497 | TC-0018-0250 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0498 | TC-0018-0250 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0499 | TC-0018-0251 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0502 | TC-0018-0254 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0503 | TC-0018-0255 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0504 | TC-0018-0255 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0505 | TC-0018-0255 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0506 | TC-0018-0255 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0507 | TC-0018-0256 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0508 | TC-0018-0257 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0509 | TC-0018-0258 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0510 | TC-0018-0259 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0511 | TC-0018-0259 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0512 | TC-0018-0259 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0513 | TC-0018-0260 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0514 | TC-0018-0260 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0515 | TC-0018-0261 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0516 | TC-0018-0262 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0517 | TC-0018-0263 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0518 | TC-0018-0264 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0519 | TC-0018-0264 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0520 | TC-0018-0264 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0521 | TC-0018-0264 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0522 | TC-0018-0265 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0523 | TC-0018-0265 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0524 | TC-0018-0265 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0527 | TC-0018-0268 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0528 | TC-0018-0269 | Closed `exception` under DR-0298; per-row review waived |
| TDD-0529 | TC-0018-0269 | Closed `exception` under DR-0298; per-row review waived |

## Grilling Session

### /qfai-implement — run started 2026-09-24T08:42:04.624Z

Preflight: confidence high. The preceding two-round session left no unresolved critical decision for this RED seam. On-detection sessions followed the Round 2 root-dotfile finding and the Round 3 ambiguity between a bare root path and a symbolic reference.

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S2 | adopted | 2026-09-24T17:02:25Z | working-tree+5749c21d82fc0b3394d35ff3447609428f20b4e817384150f77542fec3a8f73e | 2026-09-24T17:03:36.140Z | TDD-0015 root dotfile missing-path boundary | empty | none in flight | 1 | 0 | 0 |
| S3 | adopted | 2026-09-24T17:40:46Z | working-tree+7191d665068aae9662f5e9ad35e036dd5ff747ba8608336d64d878c0e5e14cba | 2026-09-24T17:50:14.293Z | Untyped extensionless path versus symbolic route reference | empty | none in flight | 1 | 0 | 0 |
| S4 | adopted | 2026-09-24T18:09:23Z | working-tree+bfdfb927eb18f1487e62acbb6130ca58deddf23dab2c3d7011f89fd26365e4cb | 2026-09-24T18:15:32.452Z | Direct work order target from a checked spec binding | empty | none in flight | 1 | 0 | 0 |
| S5 | adopted | 2026-09-24T19:48:01Z | working-tree+9b33eddcaffb7ed3738099e87d2fcfa2922eebb960271db26c5422cb6eb2d634 | 2026-09-24T20:11:21.293Z | Bugfix missing-test diagnosis and ordered work orders | empty | none in flight | 2 | 0 | 0 |

The preceding invocation did not pass the TDD-0027 RED gate. Its S5 revision was measured after work resumed, not when S5 ended, and is not accepted as a session-ending revision. The failed record is retained below as rejected provenance; the following invocation re-evaluates the current tree and re-observes RED.

### /qfai-implement — run started 2026-09-24T20:20:52.855Z

Preflight: confidence high. The prior RED failure was a session-record defect. An on-detection session settled the selector's scope and re-observation on the current tree.

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-24T20:26:22.776Z | working-tree+fcd40b3cb714bc7fbd4e1849a338e128cb85421ad54c782de859160324a64245 | 2026-09-24T20:27:01.140Z | TDD-0027 missing-test RED scope and accurate re-observation | empty | none in flight | 3 | 0 | 0 |
| S2 | adopted | 2026-09-24T21:01:47.541Z | working-tree+2b4fbf814c2df27db7b18cfceed4b84c50572b68a19a4dc2216e4437ff532428 | 2026-09-24T21:04:09.002Z | TDD-0028 bounded-change stage fixture and selector scope | empty | none in flight | 3 | 0 | 0 |

## Work Orders Summary

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | orchestrator | /root | grilling(-@2026-09-24T08:42:04.624Z/none): none | Preflight confidence check | No preflight decision opened | PASS |
| 2 | backend-engineer | /root/tdd0001_red | Observe TDD-0001 RED | TC-0018-0001; BR-0018-0001; CLI-WF questions and state machine | `### TDD-0001` RED observation and assertion-stripped run | PASS |
| 2a | qa-gatekeeper | /root/qa_review | Judge TDD-0001 RED | RED selector run and assertion-stripped result | Independent RED phase verdict, recorded in the row entry | PASS |
| 3 | backend-engineer | /root/tdd0001_red | Implement TDD-0001 GREEN | RED observation; CLI-WF CREATE question | `decide.ts` transition, GREEN and oracle run below | PASS |
| 3a | qa-gatekeeper | /root/qa_review | Judge TDD-0001 GREEN | GREEN selector run, oracle mutation and restoration | Independent build phase verdict, recorded in the row entry | PASS |
| 4 | backend-engineer | /root/tdd0001_red | Verify TDD-0001 refactor stage | Cross-spec ownership and relevant-suite rules; current code | No code edit; cross-spec check and narrow test result below | PASS |
| 5 | completion-reviewer | /root/completion_review | Review TDD-0001 specification coverage | TC-0018-0001; Round 1 phase evidence | `review-20260924182257625/R01_completion-reviewer.md` | PASS |
| 6 | implementation-reviewer | /root/tdd0001_code_review | Review TDD-0001 code and architecture | `decide.ts`; owning Plan; Round 1 phase evidence | `review-20260924182257625/R02_implementation-reviewer.md` | REVISE |
| 7 | solution-architect | /root/cr0001_sdd | Apply approved Plan correction | `CR-20260924-0001`; `01_Spec.md` Design; TC-0018-0001 | `10_Plan.md` exception and `09_delta.md` CR row | PASS |
| 8 | architecture-reviewer | /root/cr0001_review | Review CR application | Plan, delta and CR resolution | Focused re-review after record correction | PASS |
| 9 | completion-reviewer | /root/completion_review | Re-review TDD-0001 after Plan correction | Round 1 phase evidence; approved CR; current revision | `review-20260924205303198/R01_completion-reviewer.md` | PASS |
| 10 | implementation-reviewer | /root/tdd0001_code_review | Re-review TDD-0001 after Plan correction | `decide.ts`; owning Plan; current revision | `review-20260924205303198/R02_implementation-reviewer.md` | PASS |
| 11 | backend-engineer | /root/tdd0001_red | Observe TDD-0002 RED | TC-0018-0002; BR-0018-0001; CLI-WF stage transitions | `### TDD-0002` RED observation and assertion-stripped run | PASS |
| 12 | qa-gatekeeper | /root/qa_review | Judge TDD-0002 RED | RED selector, stripped run and restored test hash | Independent RED phase verdict | PASS |
| 13 | backend-engineer | /root/tdd0001_red | Implement TDD-0002 GREEN and re-verify shared test | RED observation; feature plan; TDD-0001 oracle | `decide.ts` stage transitions, GREEN and both oracle observations below | PASS |
| 14 | qa-gatekeeper | /root/qa_review | Judge TDD-0002 GREEN | GREEN selector, oracle mutation, restored source and TDD-0001 recheck | Independent build phase verdict | PASS |
| 15 | backend-engineer | /root/tdd0001_red | Verify TDD-0002 refactor stage | Current source, other-spec done rows and reverse imports | No code edit; relevant two-test suite and revision below | PASS |
| 16 | completion-reviewer | /root/completion_review | Review TDD-0002 specification coverage | TC-0018-0002; Round 1 phase evidence | `review-20260924220400000/R01_completion-reviewer.md` | PASS |
| 17 | implementation-reviewer | /root/tdd0001_code_review | Review TDD-0002 journal replay safety | `decide.ts`; CLI-WF journal contract; Round 1 phase evidence | `review-20260924220400000/R02_implementation-reviewer.md` | REVISE |
| 18 | backend-engineer | /root/tdd0001_red | Observe TDD-0002 Round 2 RED | Implementation review finding; journal replay contract | `#### Round 2` RED observation and assertion-stripped run | PASS |
| 19 | qa-gatekeeper | /root/qa_review | Judge TDD-0002 Round 2 RED | Event-derived cursor selector and restored test hash | Independent RED phase verdict | PASS |
| 20 | backend-engineer | /root/tdd0001_red | Implement TDD-0002 Round 2 GREEN | RED replay failure; journal result-reference contract | Accepted event reference; GREEN and three oracle observations below | PASS |
| 21 | qa-gatekeeper | /root/qa_review | Judge TDD-0002 Round 2 GREEN | Event replay, two TDD-0002 mutations and TDD-0001 recheck | Independent build phase verdict | PASS |
| 22 | backend-engineer | /root/tdd0001_red | Verify TDD-0002 Round 2 refactor | Current source and shared test; reverse imports | No code edit; relevant two-test suite and revision below | PASS |
| 23 | completion-reviewer | /root/completion_review | Re-review TDD-0002 specification coverage | Round 2 event-derived RED/GREEN and prior REVISE | `review-20260924223559000/R01_completion-reviewer.md` | PASS |
| 24 | implementation-reviewer | /root/tdd0001_code_review | Re-review TDD-0002 journal replay safety | `decide.ts`; Round 2 reference and stage identity | `review-20260924223559000/R02_implementation-reviewer.md` | PASS |
| 25 | orchestrator | /root | Record TDD-0002 off-boundary checkpoint | Relevant two-test refactor run; both reviewers PASS | Canonical command, result, revision and seal in TDD-0002 entry | PASS |
| 26 | qa-gatekeeper | /root/qa_review | Judge TDD-0002 12-point done gate | All phase evidence, both review packs and checkpoint | Independent final gate verdict: 12/12, no required fix | PASS |
| 27 | delivery-planner | /root/u1_plan | Select and scope TDD-0003 | TC-0018-0003; BR-0018-0002; current ledger | One causal selector covers authorization and bound SDD work order | PASS |
| 28 | backend-engineer | /root/tdd0001_red | Observe TDD-0003 RED | TC-0018-0003; CREATE question and authorization contract | `### TDD-0003` RED observation and assertion-stripped run | PASS |
| 29 | qa-gatekeeper | /root/qa_review | Judge TDD-0003 RED | RED selector and assertion-stripped result | Independent RED phase verdict; restored revision matched | PASS |
| 30 | backend-engineer | /root/tdd0001_red | Implement TDD-0003 GREEN | RED observation; CLI-WF authorization contract | `decide.ts` decision and bound SDD work order; GREEN and oracle below | PASS |
| 31 | qa-gatekeeper | /root/qa_review | Judge TDD-0003 GREEN | Restored selector, shared suite and authorization-reference oracle | Independent build phase verdict; 3/3 shared suite | PASS |
| 32 | backend-engineer | /root/tdd0001_red | Verify TDD-0003 refactor and completed-row oracles | Reverse import closure; TDD-0001/0002 prior proofs | No code edit; relevant 3-test suite and three restored mutations below | PASS |
| 33 | completion-reviewer | /root/completion_review | Review TDD-0003 specification coverage | TC-0018-0003; Round 1 phase evidence | `review-20260924232138000/R01_completion-reviewer.md` | REVISE |
| 34 | implementation-reviewer | /root/tdd0001_code_review | Review TDD-0003 authorization safety | `decide.ts`; CLI-WF/CLI-WFFILE; Round 1 evidence | `review-20260924232138000/R02_implementation-reviewer.md` | REVISE |
| 35 | backend-engineer | /root/tdd0001_red | Observe TDD-0004 RED | TC-0018-0004; BR-0018-0003; EX-0018-0003 | Two-capability selector, natural RED, assertion-stripped PASS and restored RED | PASS |
| 36 | qa-gatekeeper | /root/qa_review | Judge TDD-0004 RED | Selector, RED output, stripped output and revision | Independent RED phase verdict; reproduced assertion and verified revision | PASS |
| 37 | backend-engineer | /root/tdd0001_red | Implement TDD-0004 GREEN | RED observation; two-capability question rule | Routing question fan-out, GREEN suite and slot-ID oracle proof | PASS |
| 38 | qa-gatekeeper | /root/qa_review | Judge TDD-0004 GREEN | Restored selector, relevant suite, mutation and revision | Independent build-phase verdict; 4/4 relevant suite | PASS |
| 39 | backend-engineer | /root/tdd0001_red | Verify TDD-0004 refactor and completed-row oracles | Reverse import closure; TDD-0001/0002 original mutations | No code edit; 4/4 suite and three restored mutations below | PASS |
| 40 | completion-reviewer | /root/completion_review | Review TDD-0004 specification coverage | TC-0018-0004; Round 1 phase evidence | `review-20260925001224837/R01_completion-reviewer.md` | PASS |
| 41 | implementation-reviewer | /root/tdd0001_code_review | Review TDD-0004 question generation and sequence | `decide.ts`; CLI-WF; Round 1 evidence | `review-20260925001224837/R02_implementation-reviewer.md` | PASS |
| 42 | orchestrator | /root | Record TDD-0004 off-boundary checkpoint | Four-test relevant suite; both reviewers PASS | Canonical command, result, revision and seal in TDD-0004 entry | PASS |
| 43 | qa-gatekeeper | /root/qa_review | Judge TDD-0004 12-point done gate | All phase evidence, two reviews, pack seal and checkpoint | Independent final gate verdict: 12/12, no required fix | PASS |
| 44 | backend-engineer | /root/tdd0001_red | Observe TDD-0013 RED | TC-0018-0008; BR-0018-0006; CLI-WF decline audit | Stop-answer selector, natural RED, assertion-stripped PASS and restored RED | PASS |
| 45 | qa-gatekeeper | /root/qa_review | Judge TDD-0013 RED | Selector, RED output, stripped output and revision | Independent RED phase verdict; reproduced assertion and verified revision | PASS |
| 46 | backend-engineer | /root/tdd0001_red | Implement TDD-0013 GREEN | RED observation; CLI-WF decision and decline audit | Stop authorization, cancelled transition, GREEN suite and stop-event oracle | PASS |
| 47 | qa-gatekeeper | /root/qa_review | Judge TDD-0013 GREEN | Restored selector, relevant suite, mutation and revision | Independent build-phase verdict; 5/5 relevant suite | PASS |
| 48 | backend-engineer | /root/tdd0001_red | Verify TDD-0013 refactor and completed-row oracles | Reverse import closure; TDD-0001/0002/0004 original mutations | No code edit; 5/5 suite and four restored mutations below | PASS |
| 49 | completion-reviewer | /root/completion_review | Review TDD-0013 specification coverage | TC-0018-0008; Round 1 phase evidence | `review-20260925005231037/R01_completion-reviewer.md` | PASS |
| 50 | implementation-reviewer | /root/tdd0001_code_review | Review TDD-0013 decline audit and sequence | `decide.ts`; CLI-WF/CLI-WFFILE; Round 1 evidence | `review-20260925005231037/R02_implementation-reviewer.md` | PASS |
| 51 | orchestrator | /root | Record TDD-0013 off-boundary checkpoint | Five-test relevant suite; both reviewers PASS | Canonical command, result, revision and seal in TDD-0013 entry | PASS |
| 52 | qa-gatekeeper | /root/qa_review | Judge TDD-0013 12-point done gate | All phase evidence, two reviews, pack seal and checkpoint | Independent final gate verdict: 12/12, no required fix | PASS |
| 53 | architecture-reviewer | /root/tdd14_grill | Diagnose TDD-0014 owner mismatch | TC-0018-0010; ledger owner; spec plan | CR-20260925-0003 and scoped blocker record | PASS |
| 54 | architecture-reviewer | /root/cr0001_review | Review the TDD-0014 correction request | CR-20260925-0003; blocker work log; drift protocol | Independent pre-approval review; record issue repaired | PASS |
| 55 | test-design-analyst | /root/u1_test_design | Design TDD-0015 unknown-path boundary | TC-0018-0012; BR-0018-0008; CLI-WF route proposal | One causal assertion, observer fact and oracle plan | PASS |
| 56 | backend-engineer | /root/tdd0001_red | Observe TDD-0015 RED | TC-0018-0012; current decide.ts | Assertion RED, neutralized PASS and restored RED in TDD-0015 entry | PASS |
| 57 | qa-gatekeeper | /root/qa_review | Judge TDD-0015 RED | RED selector, assertion strip, hashes and revision | Independent RED phase verdict; reproduced assertion and verified revision | PASS |
| 58 | backend-engineer | /root/tdd0001_red | Implement TDD-0015 GREEN | RED observation; CLI-WF proposal refusal | `decide.ts` observed-path refusal, GREEN and oracle below | PASS |
| 59 | qa-gatekeeper | /root/qa_review | Judge TDD-0015 GREEN | GREEN selector, relevant suite, mutation, hashes and revision | Independent build phase verdict; 6/6 relevant suite | PASS |
| 60 | backend-engineer | /root/tdd0001_red | Verify TDD-0015 refactor | GREEN tree; reverse-import closure; completed-row oracle proofs | No code edit; relevant 6-test suite and revision below | PASS |
| 61 | completion-reviewer | /root/completion_review | Review TDD-0015 specification coverage | TC-0018-0012; Round 1 phase evidence | `review-20260925012708000/R01_completion-reviewer.md` | PASS |
| 62 | implementation-reviewer | /root/tdd0001_code_review | Review TDD-0015 code and path checks | `decide.ts`; CLI-WF; Round 1 phase evidence | `review-20260925012708000/R02_implementation-reviewer.md` | REVISE |
| 63 | backend-engineer | /root/tdd0001_red | Observe TDD-0015 Round 2 RED | Implementation review's two missing-path bypasses; TC-0018-0012 | Same selector expanded to three missing paths; assertion RED and stripped PASS | PASS |
| 64 | qa-gatekeeper | /root/qa_review | Judge TDD-0015 Round 2 RED | RED selector, assertion strip, hashes and revision | Independent RED phase verdict; three absent subjects checked | PASS |
| 65 | backend-engineer | /root/tdd0001_red | Implement TDD-0015 Round 2 GREEN | Three-path RED; Round 1 review findings | `decide.ts` checks observed and normative references, including keyed root files; GREEN and oracle results below | PASS |
| 66 | qa-gatekeeper | /root/qa_review | Judge TDD-0015 Round 2 GREEN | Restored source, three-path selector and two oracle mutations | Independent build phase verdict; revision and 6/6 suite verified | PASS |
| 67 | backend-engineer | /root/tdd0001_red | Verify TDD-0015 Round 2 refactor | Round 2 GREEN tree; reverse-import closure; completed-row oracle proofs | No code edit; relevant 6-test suite and revision below | PASS |
| 68 | completion-reviewer | /root/completion_review | Re-review TDD-0015 specification coverage | Round 2 evidence and prior REVISE findings | `review-20260925015119000/R01_completion-reviewer.md` | PASS |
| 69 | implementation-reviewer | /root/tdd0001_code_review | Re-review TDD-0015 path refusal | `decide.ts`; two Round 1 bypasses; Round 2 tests | `review-20260925015119000/R02_implementation-reviewer.md` | REVISE |
| 70 | architecture-reviewer | /root/architecture_review | grilling(S2@2026-09-24T08:42:04.624Z/agents): classify project-root dotfile references as paths | Round 2 review finding; CLI-WF unknown-path; current selector | Adopted same-selector fourth reference and local classifier condition; blanket classification would include IDs | PASS |
| 71 | backend-engineer | /root/tdd0001_red | Observe TDD-0015 Round 3 RED | Dotfile bypass; adopted S2 decision | Same selector extended with missing dotfile; natural RED, assertion strip and restored RED | PASS |
| 72 | qa-gatekeeper | /root/qa_review | Judge TDD-0015 Round 3 RED | Four-path RED selector, assertion strip, hashes and revision | Independent RED phase verdict; four-path assertion reproduced | PASS |
| 73 | backend-engineer | /root/tdd0001_red | Implement TDD-0015 Round 3 GREEN | Four-path RED; adopted S2 classifier decision | Local root-dotfile path check, GREEN and oracle result | PASS |
| 74 | qa-gatekeeper | /root/qa_review | Judge TDD-0015 Round 3 GREEN | Restored source; four-path selector; oracle mutations | Independent build phase verdict; revision and 6/6 suite verified | PASS |
| 75 | backend-engineer | /root/tdd0001_red | Verify TDD-0015 Round 3 refactor | Round 3 GREEN tree; reverse-import closure | No code edit; relevant 6-test suite and corrected revision below | PASS |
| 76 | completion-reviewer | /root/completion_review | Re-review TDD-0015 specification coverage | Round 3 evidence and prior review findings | `review-20260925023352000/R01_completion-reviewer.md` | PASS |
| 77 | implementation-reviewer | /root/tdd0001_code_review | Re-review TDD-0015 path classification | `decide.ts`; three prior bypasses; Round 3 tests | `review-20260925023352000/R02_implementation-reviewer.md` | REVISE |
| 78 | architecture-reviewer | /root/architecture_review | grilling(S3@2026-09-24T08:42:04.624Z/agents): hand off route reference typing | Round 3 review; CLI-WF ref fields and unknown-path contract | Adopted CR/SDD ownership; lexical guesses would conflate bare paths and symbolic refs | PASS |
| 79 | solution-architect | /root/cr0001_sdd | Draft CR-20260925-0004 | Untyped route refs; Round 3 review; 526-row impact audit | Three representation options and a 51-row blocked set | PASS |
| 80 | orchestrator | /root | Park CR-20260925-0004 dependent todo rows | Open CR and 51-row blocked set; drift-protocol step 2 | Forty-six `todo -> blocked`; five later-status rows unchanged; blocker work log | PASS |
| 81 | architecture-reviewer | /root/architecture_review | grilling(S4@2026-09-24T08:42:04.624Z/agents): bind direct work orders to the checked spec | CLI-WF execution context and work order; CLI-WFFILE direct plan; TDD-0026 | Use a ready snapshot with one existing spec binding, carry it to both `target` fields; leave binding selection outside this row | PASS |
| 82 | backend-engineer | /root/tdd0001_red | Observe TDD-0026 RED | TC-0018-0016; direct plan; adopted S4 decision | One direct selector fails on missing stage progression; assertion strip passes; restored RED and hashes below | PASS |
| 83 | qa-gatekeeper | /root/qa_review | Judge TDD-0026 RED | Restored selector, source/test hashes and RED revision | RED assertion and strip valid; tree revision moved during SDD edits, so re-observation required | REVISE |
| 84 | backend-engineer | /root/tdd0001_red | Re-observe TDD-0026 RED on applied SDD tree | CR2/CR3/CR4 owner reruns; original RED selector | Same assertion RED, assertion-only strip PASS, restored RED; stable revision below | PASS |
| 85 | qa-gatekeeper | /root/qa_review | Re-judge TDD-0026 RED | Re-observed selector, source/test hashes and stable revision | Independent RED phase PASS; selector, assertion strip, hashes and 2,507-record revision independently reproduced | PASS |
| 86 | backend-engineer | /root/tdd0001_red | Implement TDD-0026 GREEN and target oracle | RED selector and direct-plan contract | Direct next/accept, GREEN 1/1, related 7/7, target mutation failure, restored hashes and revision below | PASS |
| 87 | qa-gatekeeper | /root/qa_review | Judge TDD-0026 GREEN | Restored source/test, target oracle, related suite and revision | Independent GREEN PASS: selector 1/1, related suite 7/7, target mutation failed and restored; source/test hashes and 2,507-record revision reproduced | PASS |
| 88 | backend-engineer | /root/tdd0001_red | Refactor verify TDD-0026 | TDD-0026 GREEN and oracle PASS; BR-0018-0010 group | No code edit; reverse-import suite 6 files and 7 tests passed; hashes and 2,507-record revision unchanged | PASS |
| 89 | architecture-reviewer | /root/architecture_review | grilling(S5@2026-09-24T08:42:04.624Z/agents): bind bugfix work orders to a checked diagnosis | TC-0018-0016; CLI-WF diagnosis and Stage result; bugfix plan | Adopted a checked spec binding, replayed `missing-test` diagnosis, then `sdd_append`; static stage order without diagnosis would not prove the branch | PASS |
| 90 | architecture-reviewer | /root/architecture_review | grilling(S5@2026-09-24T08:42:04.624Z/agents): use an Integration added-row fixture | TC-0018-0016; TC-0018-0063/0064; CLI-WFFILE predicates | Adopted five work orders through verify and a sixth `next` returning null; conditional skip belongs to another TC | PASS |
| 91 | backend-engineer | /root/tdd0001_red | Observe TDD-0027 RED | TC-0018-0016 bugfix missing-test branch; adopted S5 decisions | Assertion RED at test:393:18, assertion-only strip PASS, restored RED and hashes below | PASS |
| 92 | qa-gatekeeper | /root/qa_review | Judge TDD-0027 RED | Restored selector, strip proof, source/test hashes and revision | REVISE: S5 revision was captured after resumed work; old invocation is incomplete | REVISE |
| 93 | orchestrator | /root | grilling(-@2026-09-24T20:20:52.855Z/none): none | New invocation preflight confidence check | No preflight decision opened | PASS |
| 94 | architecture-reviewer | /root/architecture_review | grilling(S1@2026-09-24T20:20:52.855Z/agents): replay the missing-test diagnosis | TC-0018-0016; BR-0018-0010; CLI-WF Stage result and journal | Adopted resultRef/stage-identity replay into the ready snapshot before `sdd_append` selection | PASS |
| 95 | architecture-reviewer | /root/architecture_review | grilling(S1@2026-09-24T20:20:52.855Z/agents): assert five checked work orders and terminal null | TC-0018-0016; CLI-WFFILE bugfix plan | Adopted Integration fixture, plan skill/operation, checked spec target and final null | PASS |
| 96 | architecture-reviewer | /root/architecture_review | grilling(S1@2026-09-24T20:20:52.855Z/agents): keep regression branch in its own test case | TC-0018-0016; TC-0018-0067; selector granularity | Removed the regression control from this selector; the missing-test branch remains | PASS |
| 97 | backend-engineer | /root/tdd0001_red | Re-observe TDD-0027 RED on the new invocation | Revised single-boundary selector; S1 decisions; session-end revision | RED assertion at test:376:18, assertion-only strip PASS, restored RED and 2,507-record revision below | PASS |
| 98 | qa-gatekeeper | /root/qa_review | Judge TDD-0027 re-observed RED | New invocation S1 and Round 2 selector, hashes and revision | PASS: assertion RED at :376:18, comparison-only strip PASS, restored RED, hashes and 2,507-record revision reproduced; new S1 chronology and selector scope accepted | PASS |
| 99 | backend-engineer | /root/tdd0001_red | Implement TDD-0027 GREEN and predicate oracle | Round 2 RED and qa-gatekeeper PASS; bugfix missing-test plan | Selector 1/1, reverse-import suite 8/8, predicate mutation failed and restored; hashes and revision below | PASS |
| 100 | qa-gatekeeper | /root/qa_review | Judge TDD-0027 GREEN | Restored source/test, oracle, related suite and revision | PASS: selector 1/1, related suite 8/8, predicate mutation assertion failed and restored; source/test hashes and 2,507-record revision reproduced | PASS |
| 101 | backend-engineer | /root/tdd0001_red | Refactor verify TDD-0027 | TDD-0027 GREEN/oracle and independent QA PASS | No edit; reverse-import suite 6 files/8 tests passed, source/test hashes and 2,507-record revision unchanged | PASS |
| 102 | architecture-reviewer | /root/architecture_review | grilling(S2@2026-09-24T20:20:52.855Z/agents): bind bounded-change to a checked ready snapshot | TC-0018-0016; BR-0018-0010; CLI-WF | Adopted one spec binding, empty accepted stages and unmet acceptance obligations | PASS |
| 103 | architecture-reviewer | /root/architecture_review | grilling(S2@2026-09-24T20:20:52.855Z/agents): test four provided-plan stages | TC-0018-0016; CLI-WFFILE; checked stage results | Adopted sdd_delta, acceptance, implement and verify work orders with skill, operation, target, replay and terminal null | PASS |
| 104 | architecture-reviewer | /root/architecture_review | grilling(S2@2026-09-24T20:20:52.855Z/agents): leave shipped-plan details to their owning test | TC-0018-0016; TC-0018-0020; TDD-0266 | The fixture proves progression without claiming the final shipped bounded-change plan or multiple-target selection | PASS |
| 105 | backend-engineer | /root/tdd0001_red | Observe TDD-0028 RED | S2 decisions; bounded-change test selector | Assertion RED at test:326:18; comparison-only strip PASS; restored RED; direct and bugfix siblings 2/2 PASS | PASS |
| 106 | qa-gatekeeper | /root/qa_review | Judge TDD-0028 RED | Current-run S2 chronology; Round 1 selector, strip, hashes and revision | Independent RED PASS: assertion failure and stripped pass reproduced; siblings 2/2; source/test hashes and 2,507-record revision matched | PASS |

## Ledger rows advanced

### TDD-0001

- TDD-ID: TDD-0001
- Layer: Unit
- Test file: `packages/qfai/tests/unit/workflow/oneCreateQuestionAtRouting.test.ts`
- Selector: `TC-0018-0001 (TDD-0001): Decide accept of a routing result whose checked proposal names one new capability`
- TC-ref: TC-0018-0001
- Owning module: `packages/qfai/src/core/workflow/decide.ts`
- qa-gatekeeper: PASS x2 (qa-gatekeeper#1 — RED phase gate at `working-tree+b10641cd1611e7d900e75192ec99f942671648b597a9fd5c320fe06349338b67` and HEAD `ccca63a7ad553c8eb4bbd4da38f52d2d74189cdd`; build-phase GREEN and oracle proof at `working-tree+7d838c868b8b5e07c264bc62ca5ae61447c6c1546c04aef9ce8e8a6ddc5bfea8` and the same HEAD)

#### Round 1

- Round 1: Revision: `working-tree+7d838c868b8b5e07c264bc62ca5ae61447c6c1546c04aef9ce8e8a6ddc5bfea8`
- Round 1: RED revision: `working-tree+b10641cd1611e7d900e75192ec99f942671648b597a9fd5c320fe06349338b67`
- Test file SHA-256: `4f4aa7912b036902bc30603fcca81f7a7d3cbc63b6cbc595b8527b7b232858ad`
- Seam file SHA-256: `f2b3946d88db99e1021e1b80da359f24d2dc9df780173e553a71001fe2473b6d`
- Round 1: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose` (cwd: `packages/qfai`)
- Round 1: RED failure mode: assertion
- Round 1: RED result: exit 1; one test failed inside its selector at `tests/unit/workflow/oneCreateQuestionAtRouting.test.ts:89:18`. The test module loaded. Full assertion output:

```text
× |unit| tests/unit/workflow/oneCreateQuestionAtRouting.test.ts > TC-0018-0001 (TDD-0001): Decide accept of a routing result whose checked proposal names one new capability
  → expected { state: undefined, …(2) } to deeply equal { state: 'awaiting_input', …(2) }

FAIL |unit| tests/unit/workflow/oneCreateQuestionAtRouting.test.ts > TC-0018-0001 (TDD-0001): Decide accept of a routing result whose checked proposal names one new capability
AssertionError: expected { state: undefined, …(2) } to deeply equal { state: 'awaiting_input', …(2) }

- Expected
+ Received

  Object {
-   "questions": Array [
-     Object {
-       "effects": Array [
-         "proceed",
-         "stop",
-       ],
-       "kind": "create",
-       "recommendationIsOffered": true,
-       "slotId": Any<String>,
-     },
-   ],
-   "state": "awaiting_input",
+   "questions": Array [],
+   "state": undefined,
    "workOrders": Array [],
  }

❯ tests/unit/workflow/oneCreateQuestionAtRouting.test.ts:89:18
   89|   expect(actual).toEqual(expected);
     |                  ^

Test Files  1 failed (1)
Tests       1 failed (1)
```

- Round 1: RED assertion-stripped result: The test call, inputs and both assertion operands stayed evaluated. Only the verdict line was neutralized; the same command then exited 0 and ran this one selector. The test was restored immediately, and its SHA-256 returned to `4f4aa7912b036902bc30603fcca81f7a7d3cbc63b6cbc595b8527b7b232858ad`.

```diff
@@ -86,5 +86,7 @@
     ],
     workOrders: [],
   };
-  expect(actual).toEqual(expected);
+  void actual;
+  void expected;
+  void expect;
 });
```

```text
Command: node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose
Exit: 0
✓ |unit| tests/unit/workflow/oneCreateQuestionAtRouting.test.ts > TC-0018-0001 (TDD-0001): Decide accept of a routing result whose checked proposal names one new capability
Test Files  1 passed (1)
Tests       1 passed (1)
```

- Round 1: GREEN command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose` (cwd: `packages/qfai`)
- Round 1: GREEN result: exit 0 after restoring the oracle mutation; the selected test passed. The production source SHA-256 was `f74484f5a7ab614d2f8f81cafe4f019107a0a8791bd72c51c3797bf7d94368d3`.

```text
✓ |unit| tests/unit/workflow/oneCreateQuestionAtRouting.test.ts > TC-0018-0001 (TDD-0001): Decide accept of a routing result whose checked proposal names one new capability
Test Files  1 passed (1)
Tests       1 passed (1)
```

- Round 1: Oracle proof: Replaced only the returned run state `"awaiting_input"` with `"routing"` in `decide.ts`, ran the GREEN command, and observed exit 1 inside the selected test at line 89. The unchanged CREATE question still matched. Restored the one-line mutation immediately and reran GREEN with exit 0. This mutation proves the state predicate discriminates; it does not establish the later proposal-refusal or environment checks.

```diff
-      run: { ...run, state: "awaiting_input", sequence: run.sequence + 2 },
+      run: { ...run, state: "routing", sequence: run.sequence + 2 },
```

```text
Command: node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose
Exit: 1
AssertionError: expected { state: 'routing', …(2) } to deeply equal { state: 'awaiting_input', …(2) }
-   "state": "awaiting_input",
+   "state": "routing",
❯ tests/unit/workflow/oneCreateQuestionAtRouting.test.ts:89:18
Test Files  1 failed (1)
Tests       1 failed (1)
```

- Refactor decision: no code edit. The sole transition already names its guards and question fields directly; extracting helpers now would add an abstraction before another case uses it. No test file edit is needed.
- Relevant suite: narrow suite, reverse dependency closure resolved. The new production module has no production importer; the only test importer is this row's test, and no test imports that test file.
- Refactor verify command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose` (cwd: `packages/qfai`).
- Refactor verify result: exit 0; one selected test passed after applying `CR-20260924-0001`. No source or test file changed in this review fix.
- Refactor verify revision: `working-tree+f6cd0be7eecbfe928f840cabe5a6da3f9c7dbe20cdea8f673111d9927d7649d8` (two consecutive calculations agreed; 2,495 path records).
- Round 1: Review pack (attempt 1): `review-20260924182257625` (not committed).
- Round 1: Review pack seal (attempt 1): `c8fe3a3493e4ba295c17cb6ea37da07e8a40043400305134232521bd44dcbd2b` (all four pack files, Markdown normalized and JSON raw, repo-relative path plus NUL plus content SHA-256, records sorted and joined with LF).
- Round 1: reviewer verdict (attempt 1): REVISE. The completion reviewer passed. The implementation reviewer found that `decide.ts` has no production consumer and the owning Plan does not record the independently required pure decision seam as an exception to its three-consumer rule. The behaviour-preserving review path applied `CR-20260924-0001`; the next review stays in Round 1.
- Round 1: Review pack (attempt 2): `review-20260924205303198` (not committed).
- Round 1: Review pack seal (attempt 2): `1339c2cbea4597d24d008416c4c6c56b34f907c6a7b8593712979be899d5c286` (four files, Markdown normalized and JSON raw).
- Round 1: reviewer verdict (attempt 2): PASS. Both completion and implementation reviewers independently matched `working-tree+f6cd0be7eecbfe928f840cabe5a6da3f9c7dbe20cdea8f673111d9927d7649d8` and audited evidence hash `bb3d6729c2a604a0c159a33b97fbfb037c69f1f7a03a1edbc27288466796313e`. The Plan now records the narrow pure-decision-function exception and its requiring obligation.

```text
✓ |unit| tests/unit/workflow/oneCreateQuestionAtRouting.test.ts > TC-0018-0001 (TDD-0001): Decide accept of a routing result whose checked proposal names one new capability
Test Files  1 passed (1)
Tests       1 passed (1)
```

- Spec review: PASS.
- Spec reviewed revision: `working-tree+f6cd0be7eecbfe928f840cabe5a6da3f9c7dbe20cdea8f673111d9927d7649d8`.
- Spec audited evidence hash: `bb3d6729c2a604a0c159a33b97fbfb037c69f1f7a03a1edbc27288466796313e`.
- Spec review pack: `review-20260924205303198` (not committed).
- Spec review pack seal: `1339c2cbea4597d24d008416c4c6c56b34f907c6a7b8593712979be899d5c286`.
- Code quality review: PASS.
- Code quality reviewed revision: `working-tree+f6cd0be7eecbfe928f840cabe5a6da3f9c7dbe20cdea8f673111d9927d7649d8`.
- Code quality audited evidence hash: `bb3d6729c2a604a0c159a33b97fbfb037c69f1f7a03a1edbc27288466796313e`.
- Code quality review pack: `review-20260924205303198` (not committed).
- Code quality review pack seal: `1339c2cbea4597d24d008416c4c6c56b34f907c6a7b8593712979be899d5c286`.
- Prototype parity: n/a (not UI-affecting).
- Prototype parity reviewed revision: `working-tree+f6cd0be7eecbfe928f840cabe5a6da3f9c7dbe20cdea8f673111d9927d7649d8`.
- Checkpoint verification command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose`
- Checkpoint verification cwd: `packages/qfai`
- Checkpoint verification result: `PASS; exit 0; TC-0018-0001 (TDD-0001): Decide accept of a routing result whose checked proposal names one new capability; one selected test passed`
- Checkpoint verification revision: `working-tree+f6cd0be7eecbfe928f840cabe5a6da3f9c7dbe20cdea8f673111d9927d7649d8`
- Checkpoint verification seal: `038d4cc6eb8316fd6162cf0e468b3b3541cb373b531b3a1fb674378799063162` (the canonical revision, command and result lines above).

### TDD-0002

- TDD-ID: TDD-0002
- Layer: Unit
- Test file: `packages/qfai/tests/unit/workflow/oneCreateQuestionAtRouting.test.ts`
- Selector: `TC-0018-0002 (TDD-0002): After a proceed answer, drive the feature plan to its last stage with canned accepted results`
- TC-ref: TC-0018-0002
- Owning module: `packages/qfai/src/core/workflow/decide.ts`
- qa-gatekeeper: PASS x4 (qa-gatekeeper#1 — Round 1 RED at `working-tree+cb4e1c475a4107cd444205d53400e180bd69e605a2e7efa602e5323a571d3233`; Round 1 GREEN at `working-tree+57fbb854370cb0f18a6da8a1a9a2099c07b899e9f55d1421416beeb550890b25`; Round 2 RED at `working-tree+baf390ccbdb55a4ef3f6b53c5f80fbe0cc593adf5942c67f51e7c4bdc0681db8`; Round 2 GREEN and both oracle proofs at `working-tree+6cf6876200678b49d5e891c8360829d0aca110924635582dccf1e4af7cf8dc37`; all against HEAD `ccca63a7ad553c8eb4bbd4da38f52d2d74189cdd`)

#### Round 1

- Round 1: RED revision: `working-tree+cb4e1c475a4107cd444205d53400e180bd69e605a2e7efa602e5323a571d3233`
- Round 1: RED test hash: `b4d4632503d148d7bc6f546dde991974d34812e94e9fdba7231917cb5c5cde1a`
- Seam file SHA-256: `f74484f5a7ab614d2f8f81cafe4f019107a0a8791bd72c51c3797bf7d94368d3`
- Round 1: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose --testNamePattern=TC-0018-0002` (cwd: `packages/qfai`)
- Round 1: RED failure mode: assertion
- Round 1: RED result: exit 1; the selected test loaded and failed inside its assertion at `tests/unit/workflow/oneCreateQuestionAtRouting.test.ts:181:6`. The plan issued no stages, while the test required arrival at the final `verify` stage. The later CREATE-question count was zero. The first assertion establishes stage reachability so an empty event stream cannot satisfy the row.

```text
FAIL |unit| tests/unit/workflow/oneCreateQuestionAtRouting.test.ts > TC-0018-0002 (TDD-0002): After a proceed answer, drive the feature plan to its last stage with canned accepted results
AssertionError: expected { issuedStageKinds: [], …(1) } to deeply equal { …(2) }
- Expected
+ Received
  Object {
-   "issuedStageKinds": Array ["sdd", "acceptance", "implement", "verify"],
+   "issuedStageKinds": Array [],
    "laterCreateQuestions": 0,
  }
❯ tests/unit/workflow/oneCreateQuestionAtRouting.test.ts:181:6
Test Files  1 failed (1)
Tests       1 failed | 1 skipped (2)
```

- Round 1: RED assertion-stripped result: The selected test's loop, `decide` calls and both comparison operands remained evaluated. Only the final assertion verdict was neutralized. The same command exited 0 with one selected test passed and one sibling skipped. The test was restored immediately; its SHA-256 again matched `b4d4632503d148d7bc6f546dde991974d34812e94e9fdba7231917cb5c5cde1a`.

```diff
@@ -173,13 +173,16 @@
     run = accepted.verdict.run;
   }

-  expect({
+  const actual = {
     issuedStageKinds,
     laterCreateQuestions: postRoutingEvents.filter(
       (event) => event.type === "question-opened" && event.question?.kind === "create",
     ).length,
-  }).toEqual({
+  };
+  const expected = {
     issuedStageKinds: ["sdd", "acceptance", "implement", "verify"],
     laterCreateQuestions: 0,
-  });
+  };
+  void actual;
+  void expected;
 });
```

```text
Command: node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose --testNamePattern=TC-0018-0002
Exit: 0
✓ |unit| tests/unit/workflow/oneCreateQuestionAtRouting.test.ts > TC-0018-0002 (TDD-0002): After a proceed answer, drive the feature plan to its last stage with canned accepted results
Test Files  1 passed (1)
Tests       1 passed | 1 skipped (2)
```

- Round 1: Oracle proof plan: After GREEN reaches `verify`, temporarily make a non-routing `next` decision emit one `question-opened` event with `kind: create` while preserving the issued work order. Run the same TDD-0002 selector; it must fail on `laterCreateQuestions: 1` against expected `0`. Restore the source and rerun GREEN. This tests the row's no-repeat predicate independently of the RED stage-reachability failure.
- Round 1: Revision: `working-tree+57fbb854370cb0f18a6da8a1a9a2099c07b899e9f55d1421416beeb550890b25`
- Round 1: GREEN command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose --testNamePattern=TC-0018-0002` (cwd: `packages/qfai`)
- Round 1: GREEN result: exit 0; the TDD-0002 selector passed, issuing `sdd`, `acceptance`, `implement` and `verify` in order with no later CREATE question. The complete test file also passed 2/2. The restored source SHA-256 was `15c9044818c82bd941a5fd20c28cda7453750ccba8c067bdc88d5a460a73afa1`; the unchanged test SHA-256 was `b4d4632503d148d7bc6f546dde991974d34812e94e9fdba7231917cb5c5cde1a`.

```text
✓ |unit| tests/unit/workflow/oneCreateQuestionAtRouting.test.ts > TC-0018-0002 (TDD-0002): After a proceed answer, drive the feature plan to its last stage with canned accepted results
Test Files  1 passed (1)
Tests       1 passed | 1 skipped (2)
```

- Round 1: Oracle proof: A temporary source mutation added one `create` `question-opened` event to the non-routing SDD `next` result while retaining the work order. The TDD-0002 selector failed at line 181 with all four issued stages still matching and `laterCreateQuestions: 1` against expected `0`. The mutation was removed; the selector and the complete two-test file passed again.

```diff
@@ -138,6 +138,23 @@ export function decide(
       events: [
         { type: "work-order-issued", workOrder: nextWorkOrder },
         { type: "dispatch-work-order" },
+        ...(stage.stageKind === "sdd"
+          ? [{
+              type: "question-opened",
+              question: {
+                questionId: "mutation-create",
+                kind: "create",
+                text: "Create the capability again?",
+                options: [
+                  { optionId: "create", label: "Create", description: "Proceed", effect: "proceed" },
+                  { optionId: "decline", label: "Decline", description: "Stop", effect: "stop" },
+                ],
+                selection: { min: 1, max: 1 },
+                recommendation: "create",
+                capability: { goal: "mutation", covers: [], excludes: [], slotId: approval.target.slotId },
+              },
+            } as WorkflowEvent]
+          : []),
       ],
```

```text
Command: node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose --testNamePattern=TC-0018-0002
Exit: 1
The selected assertion at line 181 received laterCreateQuestions 1 instead of 0, while all four issuedStageKinds matched.
Test Files  1 failed (1)
```

#### Shared-artifact re-verify

##### spec-0018/TDD-0001

- Evidence file: `.qfai/evidence/implement-spec-0018.md#tdd-0001`
- Revision: `working-tree+57fbb854370cb0f18a6da8a1a9a2099c07b899e9f55d1421416beeb550890b25`
- Selector: `TC-0018-0001 (TDD-0001): Decide accept of a routing result whose checked proposal names one new capability`
- Re-verify command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose --testNamePattern=TC-0018-0001` (cwd: `packages/qfai`)
- Re-verify result: PASS; exit 0; one selected test passed under the changed test file.
- Proof command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose --testNamePattern=TC-0018-0001` (cwd: `packages/qfai`), with the original one-line returned-state mutation.
- Proof result: exit 1; the selected assertion failed at line 90 with `routing` received against `awaiting_input` expected; the CREATE question and work-order checks still matched.
- Restored GREEN command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose --testNamePattern=TC-0018-0001` (cwd: `packages/qfai`)
- Restored GREEN result: PASS; exit 0; one selected test passed after restoring the source.
- RED test manifest: `packages/qfai/tests/unit/workflow/oneCreateQuestionAtRouting.test.ts` (`file`, mode `0666`, SHA-256 `b4d4632503d148d7bc6f546dde991974d34812e94e9fdba7231917cb5c5cde1a`).
- RED test hash: `3ae1c46c0b0d5740da9374b14e4f40dd9e8fd7c604ffc39bb8b4f3ab99767aaa`.

```diff
@@ -250,7 +250,7 @@ export function decide(
-      run: { ...run, state: "awaiting_input", sequence: run.sequence + 2 },
+      run: { ...run, state: "routing", sequence: run.sequence + 2 },
```

- Refactor decision: no code edit. The `next` and `accept` branches validate different state boundaries. A common abstraction would precede the later schema, receipt and staleness obligations; the current source marks the limited checks and their lifting conditions.
- Relevant suite: the shared test file is the reverse dependency closure of `decide.ts`. The two selectors include this row and completed TDD-0001. A scan of the other 18 specs found 386 `done` rows with no direct ownership of either file; no other production importer reaches the source.
- Refactor verify command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose` (cwd: `packages/qfai`).
- Refactor verify result: exit 0; both TDD-0001 and TDD-0002 selectors passed, with no source or test edit after the GREEN observations.
- Refactor verify revision: `working-tree+57fbb854370cb0f18a6da8a1a9a2099c07b899e9f55d1421416beeb550890b25` (two consecutive calculations agreed; 2,495 path records).
- Round 1: Review pack (attempt 1): `review-20260924220400000` (not committed).
- Round 1: Review pack seal (attempt 1): `3cfbbe264b6a8975bfb21219e1fb5ffec4d85ac64f967513a2303fd55e6f1916` (all four pack files, Markdown normalized and JSON raw, repo-relative path plus NUL plus content SHA-256, records sorted and joined with LF).
- Round 1: reviewer verdict (attempt 1): REVISE

#### Round 2

- Round 2: RED revision: `working-tree+baf390ccbdb55a4ef3f6b53c5f80fbe0cc593adf5942c67f51e7c4bdc0681db8`
- Round 2: RED test hash: `60ec5d84ca15aa0231c5dd819426e5656acb053eb5da88d0b9708dcbfe76125b`
- Seam file SHA-256: `15c9044818c82bd941a5fd20c28cda7453750ccba8c067bdc88d5a460a73afa1`
- Round 2: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose --testNamePattern=TC-0018-0002` (cwd: `packages/qfai`)
- Round 2: RED failure mode: assertion
- Round 2: RED result: exit 1; the selected test failed inside its assertion at `tests/unit/workflow/oneCreateQuestionAtRouting.test.ts:233:6`. The event fold found no accepted-result reference or stage identity, so the plan stopped after `sdd`. The later CREATE-question count remained zero. The test obtains `stageKind` from the previously issued work-order event and the accepted result from its `resultRef`; it does not supply the accepted cursor by hand.

```text
FAIL |unit|  tests/unit/workflow/oneCreateQuestionAtRouting.test.ts > TC-0018-0002 (TDD-0002): After a proceed answer, drive the feature plan to its last stage with canned accepted results
AssertionError: expected { issuedStageKinds: [ 'sdd' ], …(3) } to deeply equal { …(4) }

- Expected
+ Received

    "issuedStageKinds": Array [
      "sdd",
-     "acceptance",
-     "implement",
-     "verify",
    ],
    "laterCreateQuestions": 0,
-   "replayFailure": null,
-   "replayedResults": Array [
-     Object {
-       "outcome": "accepted",
-       "resultId": "result-feature-sdd",
-       "stageInstanceId": "feature-sdd",
-       "stageKind": "sdd",
-     },
-     Object {
-       "outcome": "accepted",
-       "resultId": "result-feature-acceptance",
-       "stageInstanceId": "feature-acceptance",
-       "stageKind": "acceptance",
-     },
-     Object {
-       "outcome": "accepted",
-       "resultId": "result-feature-implement",
-       "stageInstanceId": "feature-implement",
-       "stageKind": "implement",
-     },
-   ],
+   "replayFailure": "accepted event lacks its result reference or stage identity",
+   "replayedResults": Array [],
❯ tests/unit/workflow/oneCreateQuestionAtRouting.test.ts:233:6
Test Files  1 failed (1)
Tests  1 failed | 1 skipped (2)
```

- Round 2: RED assertion-stripped result: Only the final assertion verdict was neutralized; the event fold, `decide` calls, fixture lookup and both operands remained evaluated. The same command exited 0 with the TDD-0002 selector passed and the sibling skipped. The test was restored immediately; its SHA-256 returned to `60ec5d84ca15aa0231c5dd819426e5656acb053eb5da88d0b9708dcbfe76125b`.

```diff
@@ -223,14 +223,15 @@
     run = accepted.verdict.run;
   }

-  expect({
+  const actual = {
     issuedStageKinds,
     replayedResults,
     replayFailure,
     laterCreateQuestions: postRoutingEvents.filter(
       (event) => event.type === "question-opened" && event.question?.kind === "create",
     ).length,
-  }).toEqual({
+  };
+  const expected = {
     issuedStageKinds: ["sdd", "acceptance", "implement", "verify"],
     replayedResults: [
@@ -254,5 +255,7 @@
     ],
     replayFailure: null,
     laterCreateQuestions: 0,
-  });
+  };
+  void actual;
+  void expected;
 });
```

```text
Command: node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose --testNamePattern=TC-0018-0002
Exit: 0
✓ |unit| tests/unit/workflow/oneCreateQuestionAtRouting.test.ts > TC-0018-0002 (TDD-0002): After a proceed answer, drive the feature plan to its last stage with canned accepted results
Test Files  1 passed (1)
Tests       1 passed | 1 skipped (2)
```

- Round 2: Oracle proof plan: After GREEN, omit or corrupt only the `accept-nonfinal-result` event's `resultRef` and confirm this selector fails on replay identity while the work order remains issued. Restore and rerun GREEN. Also repeat Round 1's extra-CREATE-event mutation under the changed test and confirm `laterCreateQuestions: 1` against expected `0`, then restore and rerun GREEN.
- Round 2: Revision: `working-tree+6cf6876200678b49d5e891c8360829d0aca110924635582dccf1e4af7cf8dc37`
- Round 2: GREEN command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose --testNamePattern=TC-0018-0002` (cwd: `packages/qfai`)
- Round 2: GREEN result: exit 0; the selector passed with the `sdd`, `acceptance`, `implement` and `verify` work orders in order. The test replayed three accepted results from work-order events and `resultRef` documents, reported no replay failure and saw no later CREATE question. The complete shared test file passed 2/2. Restored source SHA-256: `78a84088d91dff0b946d33daec125669950ca618539ac72087461da7893e20ea`; test SHA-256: `60ec5d84ca15aa0231c5dd819426e5656acb053eb5da88d0b9708dcbfe76125b`.

```text
✓ |unit| tests/unit/workflow/oneCreateQuestionAtRouting.test.ts > TC-0018-0002 (TDD-0002): After a proceed answer, drive the feature plan to its last stage with canned accepted results
Test Files  1 passed (1)
Tests       1 passed | 1 skipped (2)
```

- Round 2: Oracle proof: Two mutations were taken against the final source and changed test. First, the accepted event's `resultRef` pointed to a missing result document. The selector failed at line 233 with replay failure, no replayed results and only `sdd` issued. Second, a non-routing SDD `next` emitted one CREATE question while retaining its work order. The selector failed at line 233 with `laterCreateQuestions: 1` against expected `0`; stage order and replayed results still matched. Each mutation was removed immediately and the same selector passed again.

```diff
@@ -184,7 +184,7 @@ export function decide(
       events: [
         {
           type: "accept-nonfinal-result",
-          resultRef: `results/${result.resultId}.json`,
+          resultRef: `results/missing-${result.resultId}.json`,
           stageInstanceId: workOrder.stageInstanceId,
           outcome: result.outcome,
         },
```

```text
Command: node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose --testNamePattern=TC-0018-0002
Exit: 1
AssertionError: expected { issuedStageKinds: [ 'sdd' ], …(3) } to deeply equal { …(4) }
Received replayFailure: "accepted event lacks its result reference or stage identity"; replayedResults: []; issuedStageKinds: ["sdd"]
❯ tests/unit/workflow/oneCreateQuestionAtRouting.test.ts:233:6
Tests  1 failed | 1 skipped (2)
```

```diff
@@ -141,6 +141,23 @@ export function decide(
       events: [
         { type: "work-order-issued", workOrder: nextWorkOrder },
         { type: "dispatch-work-order" },
+        ...(stage.stageKind === "sdd"
+          ? [{
+              type: "question-opened",
+              question: {
+                questionId: "mutation-create",
+                kind: "create",
+                text: "Create the capability again?",
+                options: [
+                  { optionId: "create", label: "Create", description: "Proceed", effect: "proceed" },
+                  { optionId: "decline", label: "Decline", description: "Stop", effect: "stop" },
+                ],
+                selection: { min: 1, max: 1 },
+                recommendation: "create",
+                capability: { goal: "mutation", covers: [], excludes: [], slotId: approval.target.slotId },
+              },
+            } as WorkflowEvent]
+          : []),
       ],
```

```text
Command: node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose --testNamePattern=TC-0018-0002
Exit: 1
AssertionError: expected { …(4) } to deeply equal { …(4) }
-   "laterCreateQuestions": 0,
+   "laterCreateQuestions": 1,
❯ tests/unit/workflow/oneCreateQuestionAtRouting.test.ts:233:6
Tests  1 failed | 1 skipped (2)
```

- Round 2: Shared test re-verification: The changed file still passes the completed TDD-0001 selector (exit 0; 1 passed and 1 sibling skipped). Repeating TDD-0001's original returned-state mutation makes its selector fail at line 90 on `routing` versus `awaiting_input`; restoring the source yields 2/2 PASS. The current test artifact is `packages/qfai/tests/unit/workflow/oneCreateQuestionAtRouting.test.ts` (`file`, mode `0666`, SHA-256 `60ec5d84ca15aa0231c5dd819426e5656acb053eb5da88d0b9708dcbfe76125b`); its one-record manifest hash is `ee9e365867b776d2b21be20ab992141cf58144b4c4bfb39e1ce243181ff21621`. This supersedes the Round 1 shared-test observation without changing its reviewed evidence.

```diff
@@ -260,7 +260,7 @@ export function decide(
-      run: { ...run, state: "awaiting_input", sequence: run.sequence + 2 },
+      run: { ...run, state: "routing", sequence: run.sequence + 2 },
```

- Round 2: Refactor decision: no code edit. The accepted event carries a result reference and stage identity, and the test reconstructs the accepted cursor from events. A generic replay abstraction is reserved for later obligations.
- Relevant suite: the shared test file covers the touched `decide.ts` module and its current reverse dependency closure; no production importer reaches the source. Both TDD-0001 and TDD-0002 selectors run in this file.
- Refactor verify command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose` (cwd: `packages/qfai`).
- Refactor verify result: exit 0; both selectors passed (2/2). No source or test edit followed the restored Round 2 GREEN observations. Source SHA-256: `78a84088d91dff0b946d33daec125669950ca618539ac72087461da7893e20ea`; test SHA-256: `60ec5d84ca15aa0231c5dd819426e5656acb053eb5da88d0b9708dcbfe76125b`.
- Refactor verify revision: `working-tree+6cf6876200678b49d5e891c8360829d0aca110924635582dccf1e4af7cf8dc37` (two consecutive calculations agreed; 2,495 path records).
- Round 2: Review pack (attempt 1): `review-20260924223559000` (not committed).
- Round 2: Review pack seal (attempt 1): `0d02f352eed07ba045537c4ad4b82e90d3ad21a5ef2e0d7428e32758179b0943` (all four pack files, Markdown normalized and JSON raw, repo-relative path plus NUL plus content SHA-256, records sorted and joined with LF).
- Round 2: reviewer verdict (attempt 1): PASS
- Spec review: PASS.
- Spec reviewed revision: `working-tree+6cf6876200678b49d5e891c8360829d0aca110924635582dccf1e4af7cf8dc37`.
- Spec audited evidence hash: `f69cef78559c1b0f8c94365654f35c6e213e592e318b0550536fa4812ce1560d`.
- Spec review pack: `review-20260924223559000` (not committed).
- Spec review pack seal: `0d02f352eed07ba045537c4ad4b82e90d3ad21a5ef2e0d7428e32758179b0943`.
- Code quality review: PASS.
- Code quality reviewed revision: `working-tree+6cf6876200678b49d5e891c8360829d0aca110924635582dccf1e4af7cf8dc37`.
- Code quality audited evidence hash: `f69cef78559c1b0f8c94365654f35c6e213e592e318b0550536fa4812ce1560d`.
- Code quality review pack: `review-20260924223559000` (not committed).
- Code quality review pack seal: `0d02f352eed07ba045537c4ad4b82e90d3ad21a5ef2e0d7428e32758179b0943`.
- Prototype parity: n/a (not UI-affecting).
- Prototype parity reviewed revision: `working-tree+6cf6876200678b49d5e891c8360829d0aca110924635582dccf1e4af7cf8dc37`.
- Checkpoint verification command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose`
- Checkpoint verification cwd: `packages/qfai`
- Checkpoint verification result: `PASS; exit 0; TC-0018-0001 (TDD-0001): Decide accept of a routing result whose checked proposal names one new capability; TC-0018-0002 (TDD-0002): After a proceed answer, drive the feature plan to its last stage with canned accepted results; two selected tests passed`
- Checkpoint verification revision: `working-tree+6cf6876200678b49d5e891c8360829d0aca110924635582dccf1e4af7cf8dc37`
- Checkpoint verification seal: `23e1c7229e251f931727c205a6fe17e21b456536d84f5000951b1285edea3449` (the canonical revision, command and result lines above).

#### Fixture correction under CR-20260924-0002

- The ready-snapshot `approval` now carries `authorizationId: "authorization-4"`. `next` no longer issues an SDD work order for a CREATE approval without a persisted ID, so the fixture's ID-less approval stopped reaching SDD.
- Before the fixture change, with the missing-ID check in `decide.ts`: exit 1; the comparison at `tests/unit/workflow/oneCreateQuestionAtRouting.test.ts:233:6` failed.
- After the fixture change: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --testNamePattern='TC-0018-0002 \(TDD-0002\)' --reporter=verbose` (cwd `packages/qfai`) exit 0; 1 passed, 1 skipped. The no-repeat assertion is unchanged. Status stays `done`.

### TDD-0003

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived; the Round 1 REVISE finding is fixed below.

- TDD-ID: TDD-0003
- Layer: Unit
- Test file: `packages/qfai/tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts`
- Selector: `TC-0018-0003 (TDD-0003): A proceed answer records a bound human decision used by the SDD work order`
- TC-ref: TC-0018-0003
- Owning module: `packages/qfai/src/core/workflow/decide.ts`
- qa-gatekeeper: PASS x2 (qa-gatekeeper#1 — RED phase at `working-tree+abb7b0f8c5bcca9e37cbf1c33e09b302054168a1b9c697c4fef4434890273085`; GREEN and oracle phase at `working-tree+3aaf41d9fc2b30faf95af865bb0bfe43deb3d544edbcc60441ed333f339d6b0a`; both against HEAD `ccca63a7ad553c8eb4bbd4da38f52d2d74189cdd`)

#### Round 1
- Round 1: RED revision: `working-tree+abb7b0f8c5bcca9e37cbf1c33e09b302054168a1b9c697c4fef4434890273085` (two consecutive calculations agreed; 2,496 path records).
- Round 1: RED test hash: `4dbed72930d7f8e4034c517eac21041120c5352944aae3082e4a17086dda6cc5`
- Seam file SHA-256: `78a84088d91dff0b946d33daec125669950ca618539ac72087461da7893e20ea`
- Round 1: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts --testNamePattern=TC-0018-0003 --reporter=verbose` (cwd: `packages/qfai`)
- Round 1: RED failure mode: assertion
- Round 1: RED result: exit 1; the selector loaded and failed at `tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts:143:18`. The decision remained `awaiting_input`, emitted no human decision, and supplied no bound SDD work order. The test continues through `next` and evaluates all four expected outcomes before its final assertion.

```text
FAIL |unit|  tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts > TC-0018-0003 (TDD-0003): A proceed answer records a bound human decision used by the SDD work order
AssertionError: expected { …(4) } to deeply equal { decisionState: 'ready', …(3) }
- Expected
+ Received
  Object {
-   "authorization": ObjectContaining {
-     "capture": "agent_captured",
-     "kind": "human_decision",
-     "operation": "CREATE",
-     "target": Object {
-       "slotId": "slot-3-1",
-     },
-   },
-   "decisionState": "ready",
-   "humanDecisionCount": 1,
+   "authorization": null,
+   "decisionState": "awaiting_input",
+   "humanDecisionCount": 0,
    "sddWorkOrder": Object {
-     "authorizationRefsMatch": true,
-     "stageKind": "sdd",
-     "target": Object {
-       "slotId": "slot-3-1",
-     },
+     "authorizationRefsMatch": false,
+     "stageKind": undefined,
+     "target": null,
    },
  }
❯ tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts:143:18
Test Files  1 failed (1)
Tests       1 failed (1)
```

- Round 1: RED assertion-stripped result: Only the final assertion changed to `void actual; void expected;`; both `decide` calls and both operands were still evaluated. The identical selector command passed 1/1 with exit 0. The test was restored and the selector failed again at the same assertion; test SHA-256 returned to `4dbed72930d7f8e4034c517eac21041120c5352944aae3082e4a17086dda6cc5`.

```diff
@@ -140,5 +140,6 @@ it("TC-0018-0003 (TDD-0003): A proceed answer records a bound human decision use
       authorizationRefsMatch: true,
     },
   };
-  expect(actual).toEqual(expected);
+  void actual;
+  void expected;
 });
```

```text
Command: node node_modules/vitest/vitest.mjs run tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts --testNamePattern=TC-0018-0003 --reporter=verbose
Exit: 0
✓ |unit| tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts > TC-0018-0003 (TDD-0003): A proceed answer records a bound human decision used by the SDD work order
Test Files  1 passed (1)
Tests       1 passed (1)
```

- Round 1: Oracle proof plan: After GREEN, temporarily remove the new SDD work order's `authorizationRefs` while preserving the authorization and target. The same selector must fail on `authorizationRefsMatch: false` against expected `true`. Restore the source and rerun GREEN.
- Round 1: Revision: `working-tree+3aaf41d9fc2b30faf95af865bb0bfe43deb3d544edbcc60441ed333f339d6b0a` (two consecutive calculations agreed; 2,496 path records).
- Round 1: GREEN command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts --testNamePattern=TC-0018-0003 --reporter=verbose` (cwd: `packages/qfai`)
- Round 1: GREEN result: exit 0; the selector passed 1/1. The decision returned a `human_decision` CREATE authorization with `capture: agent_captured` for the opened slot, and the next SDD work order carried that slot as its target and referenced the authorization document. The shared two-file suite passed all three selectors. Restored source SHA-256: `cdf08d52b6d28845f871730a9fd72837426c425bf1c041dec560a0d71ff16682`; TDD-0003 test SHA-256: `4dbed72930d7f8e4034c517eac21041120c5352944aae3082e4a17086dda6cc5`; shared test SHA-256: `60ec5d84ca15aa0231c5dd819426e5656acb053eb5da88d0b9708dcbfe76125b`.

```text
✓ |unit| tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts > TC-0018-0003 (TDD-0003): A proceed answer records a bound human decision used by the SDD work order
Test Files  1 passed (1)
Tests       1 passed (1)
```

- Round 1: Oracle proof: A temporary source mutation removed only the SDD work order's `authorizationRefs` property. The same selector failed at line 143:18 on `authorizationRefsMatch: false` against expected `true`; authorization creation, target and ready state remained. The source was restored immediately, then the selector passed 1/1 and the shared suite passed 3/3 again.

```diff
@@ -217,11 +217,6 @@ export function decide(
       ...(stage.stageKind === "sdd"
         ? {
             target: { kind: "new_capability" as const, slotId: approval.target.slotId },
-            authorizationRefs: approval.authorizationId
-              ? [`authorizations/${approval.authorizationId}.json`]
-              : [],
           }
         : {}),
```

```text
Command: node node_modules/vitest/vitest.mjs run tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts --testNamePattern=TC-0018-0003 --reporter=verbose
Exit: 1
AssertionError: expected { decisionState: 'ready', …(3) } to deeply equal { decisionState: 'ready', …(3) }
-     "authorizationRefsMatch": true,
+     "authorizationRefsMatch": false,
❯ tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts:143:18
Test Files  1 failed (1)
Tests       1 failed (1)
```

- Cross-spec ownership: all 18 other spec ledgers and 386 `done` rows were checked before editing `decide.ts`. None directly owns the source or either test file; the reverse production import closure reaches only this spec's test files. No other spec's completed row was affected.
- Refactor decision: no code edit. The new `decision` branch and SDD reference generation serve this row's causal boundary. A generic replay or decision abstraction would precede later obligations.
- Relevant suite: the reverse production import closure of `decide.ts` contains the two spec-0018 unit test files and no production importer; package fallback is unnecessary. The suite covers TDD-0001, TDD-0002 and TDD-0003.
- Refactor verify command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts --reporter=verbose` (cwd: `packages/qfai`).
- Refactor verify result: exit 0; two files and all three selectors passed before and after the completed-row oracle re-verification. No source or test edit followed the restored GREEN run.
- Refactor verify revision: `working-tree+3aaf41d9fc2b30faf95af865bb0bfe43deb3d544edbcc60441ed333f339d6b0a` (two consecutive calculations agreed; 2,496 path records).
- Completed-row oracle re-verification: On the current source, TDD-0001's returned-state mutation failed its selector at line 90:18 on `routing` versus `awaiting_input`. TDD-0002's missing-result-reference mutation failed at line 233:6 with replay failure and only SDD issued. Its later CREATE-event mutation failed at line 233:6 on `laterCreateQuestions: 1` against expected `0`, with stages and replayed results intact. Each mutation was removed immediately, and the shared suite passed 3/3 afterward. Restored source SHA-256: `cdf08d52b6d28845f871730a9fd72837426c425bf1c041dec560a0d71ff16682`; shared test SHA-256: `60ec5d84ca15aa0231c5dd819426e5656acb053eb5da88d0b9708dcbfe76125b`; TDD-0003 test SHA-256: `4dbed72930d7f8e4034c517eac21041120c5352944aae3082e4a17086dda6cc5`.

```text
TC-0018-0001 mutation: exit 1; line 90:18; expected awaiting_input, received routing; 1 failed, 1 skipped.
TC-0018-0002 missing resultRef mutation: exit 1; line 233:6; replayFailure "accepted event lacks its result reference or stage identity"; 1 failed, 1 skipped.
TC-0018-0002 extra CREATE mutation: exit 1; line 233:6; laterCreateQuestions expected 0, received 1; 1 failed, 1 skipped.
Restored suite: exit 0; Test Files 2 passed (2); Tests 3 passed (3).
```

```diff
@@ -353,7 +353,7 @@ export function decide(
-      run: { ...run, state: "awaiting_input", sequence: run.sequence + 2 },
+      run: { ...run, state: "routing", sequence: run.sequence + 2 },
@@ -277,7 +277,7 @@ export function decide(
-          resultRef: `results/${result.resultId}.json`,
+          resultRef: `results/missing-${result.resultId}.json`,
@@ -233,6 +233,9 @@ export function decide(
       events: [
         { type: "work-order-issued", workOrder: nextWorkOrder },
+        ...(stage.stageKind === "sdd"
+          ? [{ type: "question-opened", question: { kind: "create" } as WorkflowQuestion }]
+          : []),
         { type: "dispatch-work-order" },
```

- Round 1: Review pack (attempt 1): `review-20260924232138000` (not committed).
- Round 1: Review pack seal (attempt 1): `c0ea171f89875ed76b17a5f514b2e1aa1995ed734239e2e954e62e4ffb8470c5` (all four pack files, Markdown normalized and JSON raw, repo-relative path plus NUL plus content SHA-256, records sorted and joined with LF).
- Round 1: reviewer verdict (attempt 1): REVISE

#### Review fix under CR-20260924-0002

- The Round 1 blocking finding is fixed: `next` issues the SDD work order only when the CREATE approval carries a persisted `authorizationId`, and the order's `authorizationRefs` holds exactly that record's path. A missing ID opens a new `create` question instead (TDD-0527). The `SIMPLIFIED` marker that deferred this check is removed.
- `decide.ts` TS2322 fixed: the decision branch narrows `snapshot.scopeDigest` to `string` before building the authorization record.
- The test's ready snapshot now passes the recorded authorization itself as the approval, which removed a type assertion and an `exactOptionalPropertyTypes` error under `tsconfig.tests.json`.
- Re-run: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts --testNamePattern='TC-0018-0003 \(TDD-0003\)' --reporter=verbose` (cwd `packages/qfai`) exit 0; 1 passed, 1 skipped.
- The Round 1 advisory on round-evidence layout was repaired earlier (see Record defects).

### TDD-0004

- TDD-ID: TDD-0004
- Layer: Unit
- Test file: `packages/qfai/tests/unit/workflow/oneApprovalPerCapability.test.ts`
- Selector: `TC-0018-0004 (TDD-0004): Two new capabilities open two CREATE questions in one routing round`
- TC-ref: TC-0018-0004
- Owning module: `packages/qfai/src/core/workflow/decide.ts`
- qa-gatekeeper: PASS x2 (qa-gatekeeper#1 — Round 1 RED phase at `working-tree+5cfdcc5a3a2d209496a007fcd45ec33679a5b9a9de0d5662edb8cec7e657a1d9`; Round 1 GREEN and oracle phase at `working-tree+b9208778615dad76ebb308c719ced90c8e420d2c298960150de89f385a740628`; both against HEAD `ccca63a7ad553c8eb4bbd4da38f52d2d74189cdd`)

#### Round 1

- Round 1: RED revision: `working-tree+5cfdcc5a3a2d209496a007fcd45ec33679a5b9a9de0d5662edb8cec7e657a1d9` (two calculations agreed; 2,499 path records).
- Round 1: RED test hash: `9723548aff0abb35de027693ba4cd34638934c3c7b197de6ae93992de3f3ee27`
- Seam file SHA-256: `cdf08d52b6d28845f871730a9fd72837426c425bf1c041dec560a0d71ff16682`
- Round 1: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneApprovalPerCapability.test.ts --testNamePattern=TC-0018-0004 --reporter=verbose` (cwd: `packages/qfai`)
- Round 1: RED failure mode: assertion
- Round 1: RED result: exit 1; the selector loaded and failed at `tests/unit/workflow/oneApprovalPerCapability.test.ts:104:18`. The two-capability proposal was refused, leaving state `routing` and zero opened questions. The expected state was `awaiting_input` with two CREATE questions in one round, distinct slot IDs and no work order.

```text
FAIL |unit| tests/unit/workflow/oneApprovalPerCapability.test.ts > TC-0018-0004 (TDD-0004): Two new capabilities open two CREATE questions in one routing round
AssertionError: expected { state: 'routing', opened: [], …(3) } to deeply equal { state: 'awaiting_input', …(4) }
Expected: state awaiting_input; opened two distinct CREATE questions; sameRound true; distinctSlots true; workOrders 0.
Received: state routing; opened []; sameRound false; distinctSlots false; workOrders 0.
❯ tests/unit/workflow/oneApprovalPerCapability.test.ts:104:18
Test Files 1 failed (1); Tests 1 failed (1)
```

- Round 1: RED assertion-stripped result: Only the final assertion changed to `void actual; void expected;`. The `decide` call, questions, event checks and both comparison operands remained evaluated. The same command passed the selector 1/1 with exit 0. The original assertion was restored; the same selector failed again. The restored test SHA-256 was `9723548aff0abb35de027693ba4cd34638934c3c7b197de6ae93992de3f3ee27`.

```diff
-  expect(actual).toEqual(expected);
+  void actual;
+  void expected;
```

```text
✓ |unit| tests/unit/workflow/oneApprovalPerCapability.test.ts > TC-0018-0004 (TDD-0004): Two new capabilities open two CREATE questions in one routing round
Test Files 1 passed (1); Tests 1 passed (1); exit 0
```

- Round 1: Oracle proof plan: After GREEN, temporarily give the second CREATE question the first question's `slotId` while preserving both questions and their goals. The selector must fail on `distinctSlots: false` against `true`. Restore the source and rerun the selector and shared suite.
- Round 1: Revision: `working-tree+b9208778615dad76ebb308c719ced90c8e420d2c298960150de89f385a740628` (two calculations agreed; 2,499 path records).
- Round 1: GREEN command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneApprovalPerCapability.test.ts --testNamePattern=TC-0018-0004 --reporter=verbose` (cwd: `packages/qfai`)
- Round 1: GREEN result: exit 0; the selected test passed 1/1. The routing branch maps both valid capabilities to CREATE questions with distinct indexed question and slot IDs. One capability retains its existing IDs and `sequence + 2`; two emit two `question-opened` events and one `unsettled-material-input` event with `sequence + 3`. The three-file suite passed all four selectors after restoring the oracle mutation. Restored source SHA-256: `264cbf0c2d034e55f0457a2d61b907c53ecd25c3aa8be2ca6038aa6ce3195344`; TDD-0004 test SHA-256: `9723548aff0abb35de027693ba4cd34638934c3c7b197de6ae93992de3f3ee27`.

```text
✓ |unit| tests/unit/workflow/oneApprovalPerCapability.test.ts > TC-0018-0004 (TDD-0004): Two new capabilities open two CREATE questions in one routing round
Test Files 1 passed (1); Tests 1 passed (1); exit 0
```

- Round 1: Oracle proof: A temporary source mutation gave the second CREATE question the first question's `slotId` and preserved the two questions, their goals, `sameRound: true`, state `awaiting_input` and zero work orders. The selected test failed at `tests/unit/workflow/oneApprovalPerCapability.test.ts:104:18` on `distinctSlots: false` against expected `true`. The source was restored immediately; the selector passed 1/1 and the three-file suite passed 4/4. Source and test hashes returned to those in the GREEN result.

```diff
@@ -347,7 +347,7 @@ export function decide(
       goal: capability.goal,
       covers: capability.covers,
       excludes: capability.excludes,
-      slotId: `slot-${run.sequence + 1}-${index + 1}`,
+      slotId: `slot-${run.sequence + 1}-1`,
     },
```

```text
Mutation command: node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneApprovalPerCapability.test.ts --testNamePattern=TC-0018-0004 --reporter=verbose
Mutation: exit 1; FAIL |unit| tests/unit/workflow/oneApprovalPerCapability.test.ts > TC-0018-0004 (TDD-0004): Two new capabilities open two CREATE questions in one routing round
AssertionError: expected { state: 'awaiting_input', …(4) } to deeply equal { state: 'awaiting_input', …(4) }
-   "distinctSlots": true,
+   "distinctSlots": false,
❯ tests/unit/workflow/oneApprovalPerCapability.test.ts:104:18
Restored selector: exit 0; Test Files 1 passed (1); Tests 1 passed (1).
Restored relevant suite: exit 0; Test Files 3 passed (3); Tests 4 passed (4).
```

- Cross-spec ownership: The other 18 spec ledgers and 386 `done` rows were screened. Only spec-0018 names `decide.ts` directly. The reverse production import closure reaches this spec's three unit test files and no production importer.
- Refactor decision: no code edit. The routing branch maps valid capabilities to questions; another abstraction would not reduce the current obligation.
- Relevant suite: `oneCreateQuestionAtRouting.test.ts`, `theAnswerIsABoundHumanDecision.test.ts` and `oneApprovalPerCapability.test.ts` are the reverse dependency closure of `decide.ts` and cover TDD-0001 through TDD-0004.
- Refactor verify command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts --reporter=verbose` (cwd: `packages/qfai`).
- Refactor verify result: exit 0; three test files and all four selectors passed before and after the completed-row mutations. No source or test edit followed the restored GREEN run.
- Refactor verify revision: `working-tree+b9208778615dad76ebb308c719ced90c8e420d2c298960150de89f385a740628` (two calculations agreed; 2,499 path records).
- Completed-row oracle re-verification: On the current source, TDD-0001's returned-state mutation failed its selector at line 90:18 on `routing` versus `awaiting_input`. TDD-0002's missing-result-reference mutation failed at line 233:6 with replay failure and only SDD issued. Its later CREATE-event mutation failed at line 233:6 on `laterCreateQuestions: 1` against expected `0`. Each source mutation was removed immediately. The relevant suite passed 4/4 afterward. Restored source SHA-256: `264cbf0c2d034e55f0457a2d61b907c53ecd25c3aa8be2ca6038aa6ce3195344`; shared test SHA-256: `60ec5d84ca15aa0231c5dd819426e5656acb053eb5da88d0b9708dcbfe76125b`; TDD-0003 test SHA-256: `4dbed72930d7f8e4034c517eac21041120c5352944aae3082e4a17086dda6cc5`; TDD-0004 test SHA-256: `9723548aff0abb35de027693ba4cd34638934c3c7b197de6ae93992de3f3ee27`.

```text
TC-0018-0001 mutation: exit 1; line 90:18; expected awaiting_input, received routing; 1 failed, 1 skipped.
TC-0018-0002 missing resultRef mutation: exit 1; line 233:6; replayFailure "accepted event lacks its result reference or stage identity"; 1 failed, 1 skipped.
TC-0018-0002 extra CREATE mutation: exit 1; line 233:6; laterCreateQuestions expected 0, received 1; 1 failed, 1 skipped.
Restored suite: exit 0; Test Files 3 passed (3); Tests 4 passed (4).
```

- Round 1: Review pack (attempt 1): `review-20260925001224837` (not committed).
- Round 1: Review pack seal (attempt 1): `118d059f26cce67536c545949ab34b16d2f74d1ad2afd4081fb439cc72478edc` (all four pack files, Markdown normalized and JSON raw, repo-relative path plus NUL plus content SHA-256, records sorted and joined with LF).
- Round 1: reviewer verdict (attempt 1): PASS.
- Spec review: PASS.
- Spec reviewed revision: `working-tree+b9208778615dad76ebb308c719ced90c8e420d2c298960150de89f385a740628`.
- Spec audited evidence hash: `748d67d6cb2b70285f6502c00993cdcf8dcec22f6cc5aa5289c15cfa061afa68`.
- Spec review pack: `review-20260925001224837` (not committed).
- Spec review pack seal: `118d059f26cce67536c545949ab34b16d2f74d1ad2afd4081fb439cc72478edc`.
- Code quality review: PASS.
- Code quality reviewed revision: `working-tree+b9208778615dad76ebb308c719ced90c8e420d2c298960150de89f385a740628`.
- Code quality audited evidence hash: `748d67d6cb2b70285f6502c00993cdcf8dcec22f6cc5aa5289c15cfa061afa68`.
- Code quality review pack: `review-20260925001224837` (not committed).
- Code quality review pack seal: `118d059f26cce67536c545949ab34b16d2f74d1ad2afd4081fb439cc72478edc`.
- Prototype parity: n/a (not UI-affecting).
- Prototype parity reviewed revision: `working-tree+b9208778615dad76ebb308c719ced90c8e420d2c298960150de89f385a740628`.
- Checkpoint verification command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts --reporter=verbose`
- Checkpoint verification cwd: `packages/qfai`
- Checkpoint verification result: `PASS; exit 0; TC-0018-0001 (TDD-0001): Decide accept of a routing result whose checked proposal names one new capability; TC-0018-0002 (TDD-0002): After a proceed answer, drive the feature plan to its last stage with canned accepted results; TC-0018-0003 (TDD-0003): A proceed answer records a bound human decision used by the SDD work order; TC-0018-0004 (TDD-0004): Two new capabilities open two CREATE questions in one routing round; four selected tests passed`
- Checkpoint verification revision: `working-tree+b9208778615dad76ebb308c719ced90c8e420d2c298960150de89f385a740628`
- Checkpoint verification seal: `8e6ec6ed825762871b8b12387526e38079fd264b0c941be10ecad9c56086085a`

### TDD-0005

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theSddWorkOrderAlwaysHasATarget.test.ts`
- Selector: `TC-0018-0005 (TDD-0005): Issue the SDD work order, then accept an SDD result reporting bindings for the slot`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theSddWorkOrderAlwaysHasATarget.test.ts --testNamePattern='TC-0018-0005 \(TDD-0005\): Issue the SDD work order, then accept an SDD result reporting bindings for the slot' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/theSddWorkOrderAlwaysHasATarget.test.ts:97:18` — the SDD work order targeted the slot, but accepting the result with `bindings` published no `binding-recorded` event, so no later work order was issued.
- GREEN result: exit 0; `✓ ... TC-0018-0005 (TDD-0005): ...`, 1 passed. The SDD order targets `{ kind: "new_capability", slotId }`, one `binding-recorded` event carries the binding, and the next work order targets `{ kind: "spec", specId }`.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (`accept` of an SDD result publishes one `binding-recorded` event per binding; a later feature work order targets the bound spec).

### TDD-0006

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts`
- Selector: `TC-0018-0006 (TDD-0006): scope-digest-at-issue`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts --testNamePattern='TC-0018-0006 \(TDD-0006\): scope-digest-at-issue' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `toEqual(reasked)` at `tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts:104:34` — `next` issued the SDD work order (state `running`, `work-order-issued`) although the current scope digest differed from the approval's.
- GREEN result: exit 0; `✓ ... TC-0018-0006 (TDD-0006): scope-digest-at-issue`, 1 passed. State `awaiting_input`, one new `create` question for the slot, no work order.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (`approvalIsStale` compares the recorded and current scope digests; a stale approval at SDD issue re-asks through `reaskCreate`, the same path as a missing authorization ID).

### TDD-0007

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts`
- Selector: `TC-0018-0006 (TDD-0007): scope-digest-at-accept`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts --testNamePattern='TC-0018-0006 \(TDD-0007\): scope-digest-at-accept' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `toEqual(reasked)` at `tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts:108:34` — `accept` applied the SDD result (`accept-nonfinal-result`, `binding-recorded`) under a changed scope digest.
- GREEN result: exit 0; `✓ ... TC-0018-0006 (TDD-0007): scope-digest-at-accept`, 1 passed, 1 skipped. The result is not applied; the run moves to `awaiting_input` with a new `create` question.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (`accept` of the SDD work order re-asks when the approval is stale).

### TDD-0008

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts`
- Selector: `TC-0018-0006 (TDD-0008): capability-text-at-issue`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts --testNamePattern='TC-0018-0006 \(TDD-0008\): capability-text-at-issue' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `toEqual(reasked)` at `tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts:117:42` — the SDD work order was issued although the checked capability text for the slot differed from the approved text.
- GREEN result: exit 0; `✓ ... TC-0018-0006 (TDD-0008): capability-text-at-issue`, 1 passed, 2 skipped.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (`approvalIsStale` also compares the approved capability text with the current one for the slot; the new question carries the current text).

### TDD-0009

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts`
- Selector: `TC-0018-0006 (TDD-0009): capability-text-at-accept`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts --testNamePattern='TC-0018-0006 \(TDD-0009\): capability-text-at-accept' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0007 and TDD-0008: the accept-time check calls the same staleness judgement.
- GREEN result: exit 0; `✓ ... TC-0018-0006 (TDD-0009): capability-text-at-accept`, 1 passed, 3 skipped.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (no change beyond TDD-0008).

### TDD-0010

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts`
- Selector: `TC-0018-0006 (TDD-0010): widening-replan-at-issue`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts --testNamePattern='TC-0018-0006 \(TDD-0010\): widening-replan-at-issue' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0006. The fixture computes both digests from the write areas, so a replan that adds `src/billing/**` changes the scope digest the approval was given under.
- GREEN result: exit 0; `✓ ... TC-0018-0006 (TDD-0010): widening-replan-at-issue`, 1 passed.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (no change beyond TDD-0006).

### TDD-0011

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts`
- Selector: `TC-0018-0006 (TDD-0011): widening-replan-at-accept`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts --testNamePattern='TC-0018-0006 \(TDD-0011\): widening-replan-at-accept' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0007, for the same reason as TDD-0010.
- GREEN result: exit 0; `✓ ... TC-0018-0006 (TDD-0011): widening-replan-at-accept`, 1 passed, 6 skipped.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (no change beyond TDD-0007).

### TDD-0012

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts`
- Selector: `TC-0018-0007 (TDD-0012): Bind the created spec ID, then issue the next SDD-bound work order`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/stalenessIsJudgedAtIssueAndAtAccept.test.ts --testNamePattern='TC-0018-0007 \(TDD-0012\): Bind the created spec ID, then issue the next SDD-bound work order' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0005 and TDD-0006: binding the spec leaves the scope digest unchanged, so the next work order targets the bound spec and no question opens.
- GREEN result: exit 0; `✓ ... TC-0018-0007 (TDD-0012): ...`, 1 passed, 6 skipped.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (no change beyond TDD-0005).

### TDD-0013

- TDD-ID: TDD-0013
- Layer: Unit
- Test file: `packages/qfai/tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts`
- Selector: `TC-0018-0008 (TDD-0013): Declining CREATE cancels the run without a binding or work order`
- TC-ref: TC-0018-0008
- Owning module: `packages/qfai/src/core/workflow/decide.ts`
- qa-gatekeeper: PASS x2 (qa-gatekeeper#1 — Round 1 RED phase at `working-tree+25095ae4136a17dde3a3535e3cb918e8255bcfb30f6f476fa03891800ce0022b`; Round 1 GREEN and oracle phase at `working-tree+ff201ff1cb6562950dbd48dc94cd90d67d6831bcc3f83b56a91a904142437578`; both against HEAD `ccca63a7ad553c8eb4bbd4da38f52d2d74189cdd`)

#### Round 1

- Round 1: RED revision: `working-tree+25095ae4136a17dde3a3535e3cb918e8255bcfb30f6f476fa03891800ce0022b` (two calculations agreed; 2,500 path records).
- Round 1: RED test hash: `1fe32377edb633b89ca38722a823c947c1b1d2e2b7613f84a869176230197646`
- Seam file SHA-256: `264cbf0c2d034e55f0457a2d61b907c53ecd25c3aa8be2ca6038aa6ce3195344`
- Round 1: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts --testNamePattern=TC-0018-0008 --reporter=verbose` (cwd: `packages/qfai`)
- Round 1: RED failure mode: assertion
- Round 1: RED result: exit 1; the selected test loaded and failed at `tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts:86:18`. The stop answer was refused, leaving state `awaiting_input` without an authorization or stop event. The expected state was `cancelled` over `authorized-stop`, with a recorded `human_decision` stop answer, no binding and no work order.

```text
FAIL |unit|  tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts > TC-0018-0008 (TDD-0013): Declining CREATE cancels the run without a binding or work order
AssertionError: expected { ok: false, …(6) } to deeply equal { ok: true, state: 'cancelled', …(5) }

- Expected
+ Received

  Object {
-   "authorization": Object {
-     "capture": "agent_captured",
-     "effect": "stop",
-     "kind": "human_decision",
-     "operation": "CREATE",
-     "optionIds": Array [
-       "decline",
-     ],
-     "slotId": "slot-3-1",
-   },
+   "authorization": null,
    "bindingEvents": 0,
-   "ok": true,
-   "state": "cancelled",
-   "stopEvents": 1,
+   "ok": false,
+   "state": "awaiting_input",
+   "stopEvents": 0,
    "workOrder": null,
    "workOrderEvents": 0,
  }
 ❯ tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts:86:18
 Test Files  1 failed (1)
      Tests  1 failed (1)
```

- Round 1: RED assertion-stripped result: Only the final assertion changed to `void actual; void expected;`. The `decide` call, event checks and both comparison operands remained evaluated. The same command passed the selector 1/1 with exit 0. The original assertion was restored; the same selector failed again. The restored test SHA-256 was `1fe32377edb633b89ca38722a823c947c1b1d2e2b7613f84a869176230197646`.

```diff
-  expect(actual).toEqual(expected);
+  void actual;
+  void expected;
```

```text
✓ |unit| tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts > TC-0018-0008 (TDD-0013): Declining CREATE cancels the run without a binding or work order
Test Files 1 passed (1); Tests 1 passed (1); exit 0
```

- Round 1: Oracle proof plan: After GREEN, temporarily omit the `authorized-stop` event while preserving the `cancelled` verdict and recorded stop authorization. The selector must fail on `stopEvents: 0` against `1`. Restore the source and rerun the selector and relevant suite.
- Round 1: Revision: `working-tree+ff201ff1cb6562950dbd48dc94cd90d67d6831bcc3f83b56a91a904142437578` (two calculations agreed; 2,500 path records).
- Round 1: GREEN command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts --testNamePattern=TC-0018-0008 --reporter=verbose` (cwd: `packages/qfai`)
- Round 1: GREEN result: exit 0; the selected test passed 1/1. A valid stop answer records a `human_decision` with effect `stop`, emits `authorized-stop`, returns `cancelled` with sequence advanced by the two events, and issues no work order or binding. The existing proceed path stays `ready` with one event. The four-file relevant suite passed all five selectors after restoring the oracle mutation. Restored source SHA-256: `a2ff1270001346bd89f9b770925e8ff0bbef10a5e98852c409c6ef7bd8406029`; TDD-0013 test SHA-256: `1fe32377edb633b89ca38722a823c947c1b1d2e2b7613f84a869176230197646`.

```text
✓ |unit| tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts > TC-0018-0008 (TDD-0013): Declining CREATE cancels the run without a binding or work order
Test Files 1 passed (1); Tests 1 passed (1); exit 0
```

- Round 1: Oracle proof: A temporary source mutation omitted only the `authorized-stop` event, preserving the recorded stop authorization and `cancelled` verdict. The same selector failed at `tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts:86:18` on `stopEvents: 0` against expected `1`. The source was restored immediately; the selector passed 1/1 and the four-file suite passed 5/5. Source and test hashes returned to the GREEN values.

```diff
-    if (chosen.effect === "stop") events.push({ type: "authorized-stop" });
```

```text
Mutation command: node node_modules/vitest/vitest.mjs run tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts --testNamePattern=TC-0018-0008 --reporter=verbose
Mutation: exit 1; FAIL |unit| tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts > TC-0018-0008 (TDD-0013): Declining CREATE cancels the run without a binding or work order
AssertionError: expected { ok: true, state: 'cancelled', …(5) } to deeply equal { ok: true, state: 'cancelled', …(5) }
-   "stopEvents": 1,
+   "stopEvents": 0,
❯ tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts:86:18
Restored selector: exit 0; Test Files 1 passed (1); Tests 1 passed (1).
Restored relevant suite: exit 0; Test Files 4 passed (4); Tests 5 passed (5).
```

- Cross-spec ownership: The other 18 spec ledgers and their completed rows were screened. Only spec-0018 names `decide.ts` directly; no other spec's done test owns this module or a reverse dependency.
- Refactor decision: no code edit. The stop and proceed outcomes and their event counts remain clear in the local decision branch; an added abstraction would not reduce this obligation.
- Relevant suite: four unit test files directly import `decide.ts`; no production importer reaches it. They cover TDD-0001 through TDD-0004 and TDD-0013.
- Refactor verify command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts --reporter=verbose` (cwd: `packages/qfai`).
- Refactor verify result: exit 0; four files and all five selectors passed before and after the completed-row oracle mutations. No source or test edit followed the restored GREEN run.
- Refactor verify revision: `working-tree+ff201ff1cb6562950dbd48dc94cd90d67d6831bcc3f83b56a91a904142437578` (two calculations agreed; 2,500 path records).
- Completed-row oracle re-verification: TDD-0001's returned-state mutation failed its selector at line 90:18 on `routing` versus `awaiting_input`. TDD-0002's missing-result-reference mutation failed at line 233:6 with replay failure and only SDD issued. Its later CREATE-event mutation failed at line 233:6 on `laterCreateQuestions: 1` against expected `0`. TDD-0004's duplicated slot-ID mutation failed at line 104:18 on `distinctSlots: false` against `true`. Each source mutation was removed immediately; the relevant suite passed 5/5 afterward. Restored source SHA-256: `a2ff1270001346bd89f9b770925e8ff0bbef10a5e98852c409c6ef7bd8406029`; test SHA-256 values: TDD-0001/0002 `60ec5d84ca15aa0231c5dd819426e5656acb053eb5da88d0b9708dcbfe76125b`, TDD-0003 `4dbed72930d7f8e4034c517eac21041120c5352944aae3082e4a17086dda6cc5`, TDD-0004 `9723548aff0abb35de027693ba4cd34638934c3c7b197de6ae93992de3f3ee27`, TDD-0013 `1fe32377edb633b89ca38722a823c947c1b1d2e2b7613f84a869176230197646`.

```text
TC-0018-0001 mutation: exit 1; line 90:18; expected awaiting_input, received routing; 1 failed, 1 skipped.
TC-0018-0002 missing resultRef mutation: exit 1; line 233:6; replayFailure "accepted event lacks its result reference or stage identity"; 1 failed, 1 skipped.
TC-0018-0002 extra CREATE mutation: exit 1; line 233:6; laterCreateQuestions expected 0, received 1; 1 failed, 1 skipped.
TC-0018-0004 duplicated slot mutation: exit 1; line 104:18; distinctSlots expected true, received false; 1 failed.
Restored suite: exit 0; Test Files 4 passed (4); Tests 5 passed (5).
```

- Round 1: Review pack (attempt 1): `review-20260925005231037` (not committed).
- Round 1: Review pack seal (attempt 1): `51bc232f68df1ff99750fdaa733848e00338f16752ad067ef3da4e7ecf37ad4e` (all four pack files, Markdown normalized and JSON raw, repo-relative path plus NUL plus content SHA-256, records sorted and joined with LF).
- Round 1: reviewer verdict (attempt 1): PASS.
- Spec review: PASS.
- Spec reviewed revision: `working-tree+ff201ff1cb6562950dbd48dc94cd90d67d6831bcc3f83b56a91a904142437578`.
- Spec audited evidence hash: `1ad1a9d6a9e3351c9a502d5bd4d44d984fb36b3a2f619c0951c644fa7882a16a`.
- Spec review pack: `review-20260925005231037` (not committed).
- Spec review pack seal: `51bc232f68df1ff99750fdaa733848e00338f16752ad067ef3da4e7ecf37ad4e`.
- Code quality review: PASS.
- Code quality reviewed revision: `working-tree+ff201ff1cb6562950dbd48dc94cd90d67d6831bcc3f83b56a91a904142437578`.
- Code quality audited evidence hash: `1ad1a9d6a9e3351c9a502d5bd4d44d984fb36b3a2f619c0951c644fa7882a16a`.
- Code quality review pack: `review-20260925005231037` (not committed).
- Code quality review pack seal: `51bc232f68df1ff99750fdaa733848e00338f16752ad067ef3da4e7ecf37ad4e`.
- Prototype parity: n/a (not UI-affecting).
- Prototype parity reviewed revision: `working-tree+ff201ff1cb6562950dbd48dc94cd90d67d6831bcc3f83b56a91a904142437578`.
- Checkpoint verification command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts --reporter=verbose`
- Checkpoint verification cwd: `packages/qfai`
- Checkpoint verification result: `PASS; exit 0; TC-0018-0001 (TDD-0001): Decide accept of a routing result whose checked proposal names one new capability; TC-0018-0002 (TDD-0002): After a proceed answer, drive the feature plan to its last stage with canned accepted results; TC-0018-0003 (TDD-0003): A proceed answer records a bound human decision used by the SDD work order; TC-0018-0004 (TDD-0004): Two new capabilities open two CREATE questions in one routing round; TC-0018-0008 (TDD-0013): Declining CREATE cancels the run without a binding or work order; five selected tests passed`
- Checkpoint verification revision: `working-tree+ff201ff1cb6562950dbd48dc94cd90d67d6831bcc3f83b56a91a904142437578`
- Checkpoint verification seal: `a248375e5b52de270e8bd8485aceb177c4c4b1dfee914b078f7845acc1d46ff5`

### TDD-0014

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theAnnouncement.test.ts`
- Selector: `TC-0018-0010 (TDD-0014): Decide accept of a routing result whose proposal passes every check`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theAnnouncement.test.ts --testNamePattern='TC-0018-0010 \(TDD-0014\): Decide accept of a routing result whose proposal passes every check' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/theAnnouncement.test.ts:99:18` — the routing accept only knew the feature route with a new capability, so a checked bounded-change proposal was refused `invalid-input` with no plan.
- GREEN result: exit 0; `✓ ... TC-0018-0010 (TDD-0014): ...`, 1 passed. State `ready`; the verdict's plan holds the goal, the built-in plan's stages in order and the proposal's write scope; no question opens.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (a checked proposal with no new capability becomes the plan: the built-in plan for its route, passed in `facts.plans`, with the proposal's goal and write scope; one `plan-accepted` event).

### TDD-0015

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived; the Round 3 REVISE finding is fixed below under the approved reference shape.

- TDD-ID: TDD-0015
- Layer: Unit
- Test file: `packages/qfai/tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts`
- Selector: `TC-0018-0012 (TDD-0015): unknown-path`
- TC-ref: TC-0018-0012
- Owning module: `packages/qfai/src/core/workflow/decide.ts`
- qa-gatekeeper: PASS x2 (Round 1 RED phase gate at `working-tree+68d6796b21f9928473ecab7b6e48c5c706581d1e86ab7d232ee2082b06c8bceb`; GREEN and oracle phase gate at `working-tree+ad867399af45718211f7f2f98157044e07647f2cfb7cd1683e7b53d4bca52385`; both against HEAD `ccca63a7ad553c8eb4bbd4da38f52d2d74189cdd`)

#### Round 1

- Round 1: RED revision: `working-tree+68d6796b21f9928473ecab7b6e48c5c706581d1e86ab7d232ee2082b06c8bceb` (independently calculated; 2,503 path records).
- Round 1: RED test hash: `36b3bb736e8be02c12d4991bb32824ddfe18615419e3fcb9154171586ea0360b`
- Seam file SHA-256: `a2ff1270001346bd89f9b770925e8ff0bbef10a5e98852c409c6ef7bd8406029`
- Round 1: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern=TC-0018-0012 --reporter=verbose` (cwd: `packages/qfai`)
- Round 1: RED failure mode: assertion
- Round 1: RED result: exit 1; the test loaded and failed at `tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:86:18`. Its only nonexistent `observedRefs` path is `packages/qfai/src/core/workflow/missing-observed-reference.ts`, and `facts.pathExistence` marks that same path false. The current core opens a CREATE question and moves from `routing` sequence 2 to `awaiting_input` sequence 4. The test expects `proposal-refused`, projects `error.reasons[].reason` to `reasons: ["unknown-path"]`, and checks the unchanged run and empty events. It does not assert `error.reasons[].subject`.

```text
FAIL |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0015): unknown-path
AssertionError: expected { ok: true, code: undefined, …(3) } to deeply equal { ok: false, …(4) }
❯ tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:86:18
Test Files 1 failed (1); Tests 1 failed (1); exit 1
```

- Round 1: RED assertion-stripped result: Only the final assertion changed to `void actual; void expected;`. The `decide` call, reason extraction and both operands remained evaluated. The same selector passed 1/1 with exit 0. The original assertion was restored and failed at the same line. The restored test SHA-256 is `36b3bb736e8be02c12d4991bb32824ddfe18615419e3fcb9154171586ea0360b`.

```diff
-  expect(actual).toEqual(expected);
+  void actual;
+  void expected;
```

```text
✓ |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0015): unknown-path
Test Files 1 passed (1); Tests 1 passed (1); exit 0
```

- Round 1: Oracle proof plan: After GREEN, temporarily omit the unknown-path refusal while preserving routing acceptance. The same selector must fail on `ok: true`, `awaiting_input` and question events against the refusal expectation. Restore the source and rerun the selector and relevant suite.
- Round 1: Revision: `working-tree+ad867399af45718211f7f2f98157044e07647f2cfb7cd1683e7b53d4bca52385` (two calculations agreed; 2,503 path records).
- Round 1: GREEN command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern=TC-0018-0012 --reporter=verbose` (cwd: `packages/qfai`)
- Round 1: GREEN result: exit 0; one selected test passed. For a path-shaped `observedRefs` item without a true entry under the same key in `facts.pathExistence`, the pure core returns `proposal-refused` with `{ reason: "unknown-path", subject: path }`, preserves the `routing` run and emits no event. It does not check future `proposedWriteScope` globs. Restored source SHA-256: `d9534af70fed9e4e300aef115edbe5c01d7d68ea280762cadea55f6b76a8debc`; test SHA-256: `36b3bb736e8be02c12d4991bb32824ddfe18615419e3fcb9154171586ea0360b`.

```text
✓ |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0015): unknown-path
Test Files 1 passed (1); Tests 1 passed (1); exit 0
```

- Round 1: Oracle proof: The guard was changed from `unknownPaths.length > 0` to `< 0` without altering the test. The same selector failed at `:86:18` because it returned `ok: true`, state `awaiting_input`, sequence 4 and question events rather than the refusal. The source was restored immediately; selector 1/1 and the five-file relevant suite 6/6 passed. Both source and test hashes returned to the GREEN values.

```diff
-  if (unknownPaths.length > 0) {
+  if (unknownPaths.length < 0) {
```

```text
Mutation command: node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern=TC-0018-0012 --reporter=verbose (cwd: packages/qfai).
Mutation selector: exit 1; FAIL |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0015): unknown-path; AssertionError at tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:86:18.
Expected projection: ok false; code proposal-refused; reasons [unknown-path]; run routing/2; events [].
Received projection: ok true; code undefined; reasons []; run awaiting_input/4; two events (question-opened and unsettled-material-input).
Restored selector: exit 0; Test Files 1 passed (1); Tests 1 passed (1).
Restored relevant suite: exit 0; Test Files 5 passed (5); Tests 6 passed (6).
```

- Completed-row oracle re-verification: The original TDD-0001 returned-state mutation failed at line 90:18. TDD-0002's result-reference mutation and extra CREATE mutation each failed at line 233:6. TDD-0004's duplicated slot mutation failed at line 104:18. TDD-0013's omitted `authorized-stop` event failed at line 86:18. Each selector failed on its original assertion, and each source mutation was restored immediately. The relevant suite passed 6/6 afterward. Restored source SHA-256: `d9534af70fed9e4e300aef115edbe5c01d7d68ea280762cadea55f6b76a8debc`.
- Cross-spec ownership: Eighteen other spec ledgers were screened. No `done` row directly owns `decide.ts` or the new test, and no production importer reaches `decide.ts`. Five unit test files import it directly.
- Relevant suite command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --reporter=verbose` (cwd: `packages/qfai`).
- Relevant suite result: exit 0; five files and six selectors passed after restoring every mutation.
- Quality checks: direct Prettier and ESLint on `decide.ts`, and `tsc -p packages/qfai/tsconfig.tests.json --noEmit`, each exited 0. The root `pnpm` gate remains unavailable because the existing `node_modules` junction is rejected as unsafe before scripts run.
- Refactor decision: no code edit. The local filter and early refusal serve one reason; extracting a shared proposal validator is deferred until later proposal-reason rows supply its other checks.
- Refactor verify command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --reporter=verbose` (cwd: `packages/qfai`).
- Refactor verify result: exit 0; five files and six selectors passed. No source or test edit followed the restored GREEN run. The completed-row oracle re-verification above applies to the same source and test hashes.
- Refactor verify revision: `working-tree+ad867399af45718211f7f2f98157044e07647f2cfb7cd1683e7b53d4bca52385` (two calculations agreed; 2,503 path records).
- Round 1: Review pack (attempt 1): `review-20260925012708000` (not committed).
- Round 1: Review pack seal (attempt 1): `95b8a7a4d5ba0147a9bc846e1d4680cb3398ecfdaa23e3f496f4bad0e7a9054d` (all four pack files, Markdown normalized and JSON raw, repo-relative path plus NUL plus content SHA-256, records sorted and joined with LF).
- Round 1: reviewer verdict (attempt 1): REVISE. The implementation review found two bypasses: an extensionless root-file `observedRefs` path with an explicit false existence fact, and a nonexistent path in `expectedBehaviorRefs`. Both reach the CREATE question instead of `unknown-path` refusal. The completion review passed the tested boundary and recorded a nonblocking example-trace advisory.

#### Round 2

- Round 2: RED revision: `working-tree+12d8fa6bb8b8468b6f738d61b6eb13a65e07f886e4aee53cb58b3af5e14e8733` (two calculations agreed; 2,503 path records).
- Round 2: RED test hash: `cde1e3f4ce00ffa8742eb5bab8ac328980f5270e8f1136dc618a8615390ab560`
- Seam file SHA-256: `d9534af70fed9e4e300aef115edbe5c01d7d68ea280762cadea55f6b76a8debc`
- Round 2: qa-gatekeeper RED: PASS at `working-tree+12d8fa6bb8b8468b6f738d61b6eb13a65e07f886e4aee53cb58b3af5e14e8733` against HEAD `ccca63a7ad553c8eb4bbd4da38f52d2d74189cdd`.
- Round 2: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern=TC-0018-0012 --reporter=verbose` (cwd: `packages/qfai`)
- Round 2: RED failure mode: assertion
- Round 2: RED result: exit 1; the single selector loaded and failed at `tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:99:18`. Three absent paths are supplied in `facts.pathExistence` and the proposal: the original slash-containing observed path, extensionless root file `Dockerfile`, and normative `.qfai/specs/missing/01_Spec.md`. The core returns `proposal-refused`, keeps the run at `routing` sequence 2 and emits no event, but its `reasons[]` contains only the original observed path. The test expects `unknown-path` with the correct subject for all three.

```text
FAIL |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0015): unknown-path
AssertionError: expected { ok: false, …(4) } to deeply equal { ok: false, …(4) }
Expected reasons: [.qfai/specs/missing/01_Spec.md, Dockerfile, packages/qfai/src/core/workflow/missing-observed-reference.ts], each with reason unknown-path.
Received reasons: [packages/qfai/src/core/workflow/missing-observed-reference.ts] only; code, run and events matched.
❯ tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:99:18
Test Files 1 failed (1); Tests 1 failed (1); exit 1
```

- Round 2: RED assertion-stripped result: Only the final assertion changed to `void actual; void expected;`. The `decide` call, all three path observations, projections and both comparison operands remained evaluated. The same selector passed 1/1 with exit 0. The original assertion was restored and failed at the same line. Restored test SHA-256: `cde1e3f4ce00ffa8742eb5bab8ac328980f5270e8f1136dc618a8615390ab560`.

```diff
-  expect(actual).toEqual(expected);
+  void actual;
+  void expected;
```

```text
✓ |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0015): unknown-path
Test Files 1 passed (1); Tests 1 passed (1); exit 0
```

- Round 2: Oracle proof plan: After GREEN, separately suppress the explicit false fact for an extensionless root file and omit normative references from the unknown-path candidate set. Each temporary mutation must make the same selector fail with two reasons instead of three, while preserving the original slash-containing observed-path refusal. Restore and rerun the selector and relevant suite after each mutation.
- Round 2: Revision: `working-tree+5749c21d82fc0b3394d35ff3447609428f20b4e817384150f77542fec3a8f73e` (two consecutive calculations agreed; 2,503 path records).
- Round 2: GREEN command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern=TC-0018-0012 --reporter=verbose` (cwd: `packages/qfai`).
- Round 2: GREEN result: exit 0; one selected test passed. The pure core refused all three absent references with `unknown-path` and the correct subject while preserving the `routing` run and emitting no event. It now checks `expectedBehaviorRefs` and `observedRefs` together, de-duplicates references, and treats an explicit `facts.pathExistence` key as a path even when the name has no slash or extension. The restored source SHA-256 is `d1040dc41c4979a81b3056fc570e4d33dd84c86fb5fc69f1f9e6aa2ca03d5e78`; the test SHA-256 is `cde1e3f4ce00ffa8742eb5bab8ac328980f5270e8f1136dc618a8615390ab560`.

```text
Test Files  1 passed (1)
Tests       1 passed (1)
```

- Round 2: Oracle proof: Two isolated source mutations made the same selector fail at line 99 with exit 1. Replacing the explicit existence-key check with `false` omitted only the `Dockerfile` reason. Removing `expectedBehaviorRefs` from the candidate set omitted only the `.qfai/specs/missing/01_Spec.md` reason. Both mutations were restored immediately, and the selector passed again. The original completed-row mutations for TDD-0001, TDD-0002 (result reference and extra CREATE question), TDD-0004 and TDD-0013 all failed their respective selectors by assertion and were restored. The full relevant suite then passed 6/6.
- Round 2: Oracle command for each isolated mutation: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern=TC-0018-0012 --reporter=verbose` (cwd: `packages/qfai`). Each run exited 1 on the selected row's assertion at line 99; neither was a load or syntax failure. The mutations were applied and restored one at a time.

```diff
-Object.hasOwn(facts.pathExistence ?? {}, ref)
+false
```

```diff
-new Set([...proposal.expectedBehaviorRefs, ...proposal.observedRefs])
+new Set([...proposal.observedRefs])
```

```text
Mutation 1: explicit existence-key check replaced by false
FAIL |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0015): unknown-path
AssertionError: expected { ok: false, …(4) } to deeply equal { ok: false, …(4) }
-       "subject": "Dockerfile",
Received retained the normative path and slash-containing observed path, but omitted Dockerfile.
❯ tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:99:18
Test Files  1 failed (1); Tests  1 failed (1); exit 1

Mutation 2: expectedBehaviorRefs omitted from candidate set
FAIL |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0015): unknown-path
AssertionError: expected { ok: false, …(4) } to deeply equal { ok: false, …(4) }
-       "subject": ".qfai/specs/missing/01_Spec.md",
Received retained Dockerfile and the slash-containing observed path, but omitted the normative path.
❯ tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:99:18
Test Files  1 failed (1); Tests  1 failed (1); exit 1
```

- Round 2: Relevant suite: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --reporter=verbose` (cwd: `packages/qfai`), exit 0; five files and six tests passed after all source mutations were restored.
- Round 2: Quality checks: direct Prettier and ESLint on `decide.ts`, and `tsc -p packages/qfai/tsconfig.tests.json --noEmit`, each exited 0. The root `pnpm` commands cannot start because the existing `node_modules` junction is rejected as unsafe before scripts run.
- Round 2: qa-gatekeeper GREEN: PASS at `working-tree+5749c21d82fc0b3394d35ff3447609428f20b4e817384150f77542fec3a8f73e` against HEAD `ccca63a7ad553c8eb4bbd4da38f52d2d74189cdd`. The independent replay ran the selector 1/1 and relevant suite 6/6, checked both assertion-failing mutations and restored hashes, and recomputed the 2,503-record revision.
- Round 2: Refactor decision: no code edit. The local set of normative and observed references and the existing early refusal cover this row. A shared validator is deferred until later proposal-reason rows need it.
- Round 2: Refactor verify command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --reporter=verbose` (cwd: `packages/qfai`).
- Round 2: Refactor verify result: exit 0; five files and six tests passed. No source or test edit followed the GREEN and oracle observations. The source and test SHA-256 values remain `d1040dc41c4979a81b3056fc570e4d33dd84c86fb5fc69f1f9e6aa2ca03d5e78` and `cde1e3f4ce00ffa8742eb5bab8ac328980f5270e8f1136dc618a8615390ab560`. The reverse import scan found five direct unit tests, no production importer and no other spec's completed row directly owning these paths.
- Round 2: Refactor verify revision: `working-tree+5749c21d82fc0b3394d35ff3447609428f20b4e817384150f77542fec3a8f73e` (two consecutive calculations agreed; 2,503 path records).
- Round 2: Review pack (attempt 1): `review-20260925015119000` (not committed).
- Round 2: Review pack seal (attempt 1): `82bc38bc6365bb2c1c8a76ffb5dffeabe6122200a9508faf470f48f0cced17ac` (all four pack files, Markdown normalized and JSON raw, repo-relative path plus NUL plus content SHA-256, records sorted and joined with LF).
- Round 2: reviewer verdict (attempt 1): REVISE. Completion review passed. Implementation review confirmed the two Round 1 fixes but reproduced a project-root dotfile reference `.missing-observed-file` with no existence fact passing to a CREATE question. The CLI-WF missing-path rule requires fail-closed refusal; Round 3 will extend the same selector and path classification. Both reviewers independently recorded revision `working-tree+5749c21d82fc0b3394d35ff3447609428f20b4e817384150f77542fec3a8f73e` and audited evidence hash `ef7f28929a16c25a1b951e011a110f0a6f9b18a3f7fcf767a1fac96066da9d1a`.

#### Round 3

- Round 3: RED revision: `working-tree+6556c52da5c75b8c4b49096ddaf8a8a3af08d060d64f75fe8496cbf53c482c11` (two consecutive calculations agreed; 2,503 path records).
- Round 3: RED test hash: `3adc955c8b3681b7842c4f70a58ececfb88dcb67fbdd6150dbfbaac42adf0865`
- Seam file SHA-256: `d1040dc41c4979a81b3056fc570e4d33dd84c86fb5fc69f1f9e6aa2ca03d5e78`
- Round 3: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern=TC-0018-0012 --reporter=verbose` (cwd: `packages/qfai`).
- Round 3: RED failure mode: assertion
- Round 3: RED result: exit 1; the selected test failed at `tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:100:18`. The same proposal now includes `.missing-observed-file` in `observedRefs` with no corresponding `facts.pathExistence` key. The test observes that the file does not exist. The current code returns the existing three `unknown-path` reasons but omits the dotfile reason; refusal code, `routing` sequence 2 and empty events match.

```text
FAIL |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0015): unknown-path
AssertionError: expected { ok: false, …(4) } to deeply equal { ok: false, …(4) }
Expected also includes: "subject": ".missing-observed-file"
Received omits only the dotfile reason and retains the other three reasons.
❯ tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:100:18
Test Files  1 failed (1); Tests  1 failed (1); exit 1
```

- Round 3: RED assertion-stripped result: Only the final assertion was replaced by `void actual; void expected;`; the proposal, `decide` call and both comparison operands still ran. The same selector passed 1/1 with exit 0. The test was restored immediately and failed again at line 100. The restored test SHA-256 is `3adc955c8b3681b7842c4f70a58ececfb88dcb67fbdd6150dbfbaac42adf0865`.

```diff
-  expect(actual).toEqual(expected);
+  void actual;
+  void expected;
```

```text
Assertion-stripped selector, same command as RED:
✓ |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0015): unknown-path
Test Files  1 passed (1); Tests  1 passed (1); exit 0.
Restored selector: Test Files 1 failed (1); Tests 1 failed (1); exit 1, assertion at line 100.
Baseline excluding this RED selector: Test Files 4 passed (4); Tests 5 passed (5); exit 0.
```

- Round 3: Oracle proof plan: After GREEN, remove only the root-dotfile path condition. The same selector must fail with the dotfile reason absent and the other three reasons retained. Restore immediately, rerun the selector and relevant suite, and reverify completed-row oracles for the shared source.
- Round 3: Quality checks: direct Prettier and ESLint on the test, plus `tsc -p packages/qfai/tsconfig.tests.json --noEmit`, each exited 0.
- Round 3: qa-gatekeeper RED: PASS at `working-tree+6556c52da5c75b8c4b49096ddaf8a8a3af08d060d64f75fe8496cbf53c482c11` against HEAD `ccca63a7ad553c8eb4bbd4da38f52d2d74189cdd`. The independent replay reproduced the assertion failure for the single missing dotfile reason, checked the selector's assertion-stripped PASS and restored test/source hashes, and recomputed the 2,503-record revision.
- Round 3: Revision: `working-tree+7191d665068aae9662f5e9ad35e036dd5ff747ba8608336d64d878c0e5e14cba` (two consecutive calculations agreed; 2,503 path records).
- Round 3: GREEN command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern=TC-0018-0012 --reporter=verbose` (cwd: `packages/qfai`).
- Round 3: GREEN result: exit 0; the selected test passed 1/1 with `unknown-path` reason and subject for all four missing references, unchanged `routing` sequence 2 and no events. The only code change in this round is a root-dotfile path condition in the existing classifier. Restored source SHA-256: `7ae81e330477f88082308bd864fa27bb608cc43402c7199d6c73c75825f8de6e`; test SHA-256: `3adc955c8b3681b7842c4f70a58ececfb88dcb67fbdd6150dbfbaac42adf0865`.

```text
✓ |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0015): unknown-path
Test Files  1 passed (1); Tests  1 passed (1); exit 0
```

- Round 3: Oracle proof: Three isolated mutations each made the same TDD-0015 selector fail at the final assertion, and each was restored immediately. Removing the new dotfile condition omitted only `.missing-observed-file`; disabling the explicit existence-key check omitted only `Dockerfile`; omitting `expectedBehaviorRefs` from the candidate set omitted only `.qfai/specs/missing/01_Spec.md`. The completed-row mutations for TDD-0001, TDD-0002 (result reference and extra CREATE question), TDD-0004 and TDD-0013 also failed their own selectors by assertion and were restored. All eight mutations were removed before the final relevant-suite run.
- Round 3: Oracle command for each TDD-0015 mutation: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern=TC-0018-0012 --reporter=verbose` (cwd: `packages/qfai`). Each run exited 1 on the selected test's assertion at line 100, with the named reason absent and the other three reasons retained.

```diff
-        /^\.[^./\\]+$/.test(ref)) &&
+        false) &&
```

```text
Mutation 1 (root-dotfile condition removed): expected 4 reasons, received 3; missing subject .missing-observed-file.
Mutation 2 (explicit existence-key check removed): expected 4 reasons, received 3; missing subject Dockerfile.
Mutation 3 (normative candidate removed): expected 4 reasons, received 3; missing subject .qfai/specs/missing/01_Spec.md.
Each: FAIL |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0015): unknown-path
Each: AssertionError at tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:100:18; Test Files 1 failed (1); Tests 1 failed (1); exit 1.
Each: ok false, proposal-refused, routing sequence 2 and events [] matched the expectation.
```

- Round 3: Relevant suite: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --reporter=verbose` (cwd: `packages/qfai`), exit 0; five files and six tests passed after every mutation was restored.
- Round 3: Quality checks: direct Prettier and ESLint on `decide.ts`, and `tsc -p packages/qfai/tsconfig.tests.json --noEmit`, each exited 0.
- Round 3: qa-gatekeeper GREEN: PASS at `working-tree+7191d665068aae9662f5e9ad35e036dd5ff747ba8608336d64d878c0e5e14cba` against HEAD `ccca63a7ad553c8eb4bbd4da38f52d2d74189cdd`. The independent replay ran the selector 1/1 and relevant suite 6/6, checked the dotfile mutation's assertion failure and restored hashes, and recomputed the 2,503-record revision.
- Round 3: Refactor decision: no code edit. The root-dotfile condition is one local branch of the existing path classifier. A broader abstraction is unnecessary for this row.
- Round 3: Refactor verify command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --reporter=verbose` (cwd: `packages/qfai`).
- Round 3: Refactor verify result: exit 0; five files and six tests passed. No source or test edit followed the restored GREEN observations. The reverse import scan found five direct unit tests and no production importer. Source and test SHA-256 values remain `7ae81e330477f88082308bd864fa27bb608cc43402c7199d6c73c75825f8de6e` and `3adc955c8b3681b7842c4f70a58ececfb88dcb67fbdd6150dbfbaac42adf0865`.
- Round 3: Refactor verify revision: `working-tree+7191d665068aae9662f5e9ad35e036dd5ff747ba8608336d64d878c0e5e14cba` (two corrected calculations agreed; 2,503 path records). An earlier temporary helper erroneously included 49 evidence paths and produced `working-tree+12f88ce329cd165178c482347bfd2e42e4eb44a58a31b68a59add096b715b5e2`; that value is invalid and was not used for a gate or review. The helper was corrected, rerun twice and removed.
- Round 3: Review pack (attempt 1): `review-20260925023352000` (not committed).
- Round 3: Review pack seal (attempt 1): `2a922e435142d870d0d564fd76a3caa6153886d9455edff620b58ea9e01d2828` (all four pack files, Markdown normalized and JSON raw, repo-relative path plus NUL plus content SHA-256, records sorted and joined with LF).
- Round 3: reviewer verdict (attempt 1): REVISE. Completion review passed. Implementation review confirmed all three prior fixes but reproduced an absent extensionless root path `Dockerfile` without any `facts.pathExistence` entry passing to a CREATE question. The untyped reference also admits symbolic values such as `request`, so the next step must settle path classification before another GREEN edit. Both reviewers independently recorded revision `working-tree+7191d665068aae9662f5e9ad35e036dd5ff747ba8608336d64d878c0e5e14cba` and audited evidence hash `03c9f1dd6a57b53b10fb43184beabf4458668467368439acf24008823174d733`.

#### Typed route references under CR-20260925-0004

- Test file: `packages/qfai/tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts`
- Selector: `TC-0018-0012 (TDD-0015): unknown-path`
- The fixture now carries `{ kind, ref }` entries: normative `request` and a missing `path`; observed a missing `path`, `Dockerfile` as a `path` with no path-existence fact, and a missing `evidence` file with no fact.
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern='TC-0018-0012 \(TDD-0015\): unknown-path' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:106:18` — `code` was `invalid-input` where `proposal-refused` with four `unknown-path` reasons was expected.
- GREEN result: exit 0; `✓ ... TC-0018-0012 (TDD-0015): unknown-path`, 1 passed.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (classifies a reference by its declared kind; a `path` or `evidence` reference without a `true` existence fact is `unknown-path`; spelling and observer-map keys no longer decide), `packages/qfai/src/core/workflow/parse.ts` (the reference kinds and entry type).
- Shared fixtures migrated to typed references: `oneCreateQuestionAtRouting.test.ts` (TDD-0001) and `oneApprovalPerCapability.test.ts` (TDD-0004), with the symbolic `request` entry typed as `request`. All ten selectors in `tests/unit/workflow/` pass after the change, TDD-0001, TDD-0004 and TDD-0013 included.

### TDD-0016

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts`
- Selector: `TC-0018-0012 (TDD-0016): unknown-id`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern='TC-0018-0012 \(TDD-0016\): unknown-id' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:196:18` — typed `spec-id` and `contract-id` references that resolve to nothing reached the CREATE question.
- GREEN result: exit 0; `✓ ... TC-0018-0012 (TDD-0016): unknown-id`, 1 passed, 1 skipped. `proposal-refused` with one `unknown-id` reason per reference; state `routing`, no events.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (`proposalRefusals` collects every failed proposal check; a `spec-id` absent from `facts.specs` or a `contract-id` absent from `facts.contractIds` is `unknown-id`, judged by the declared kind).

### TDD-0017

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts`
- Selector: `TC-0018-0012 (TDD-0017): inactive-spec`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern='TC-0018-0012 \(TDD-0017\): inactive-spec' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:211:18` — an affected spec whose lifecycle is `retired` was not refused.
- GREEN result: exit 0; `✓ ... TC-0018-0012 (TDD-0017): inactive-spec`, 1 passed, 2 skipped. `proposal-refused` / `inactive-spec` naming `spec-0008`; state `routing`, no events.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (an affected spec whose lifecycle fact is not `active` is `inactive-spec`).

### TDD-0018

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts`
- Selector: `TC-0018-0012 (TDD-0018): broken-reference`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern='TC-0018-0012 \(TDD-0018\): broken-reference' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: undefined, reasons: [], …(2) } to deeply equal { code: 'proposal-refused', …(3) }` at `tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:225:18`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts > TC-0018-0012 (TDD-0018): broken-reference`
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Design choice: observers report item references as `facts.itemReferences`, a map from the reference to its resolution, `resolved` or `unresolved`. It has the shape `facts.pathExistence` and `facts.receiptValidity` already have: keyed by what was observed, valued by what the observation found. The core refuses every `unresolved` entry `broken-reference`, naming the reference, and reads no spec or contract text itself. Which references an observer reports, and how it spells one, stay the observer's; no later row in this ledger specifies that observer, so the fact carries no further field. Decided between agents.

### TDD-0019

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts`
- Selector: `TC-0018-0012 (TDD-0019): protected-surface`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern='TC-0018-0012 \(TDD-0019\): protected-surface' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:225:18` — write areas under `.qfai/runs/`, a change-request record and one overlapping a protected target reached the CREATE question.
- GREEN result: exit 0; `✓ ... TC-0018-0012 (TDD-0019): protected-surface`, 1 passed, 3 skipped. One `protected-surface` reason per offending write area; state `routing`, no events.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (a write area whose literal prefix lies inside a protected path or record pattern, or overlaps a protected target, is `protected-surface`; the overlap rule is a marked simplification).

### TDD-0020

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts`
- Selector: `TC-0018-0012 (TDD-0020): scope-escape`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern='TC-0018-0012 \(TDD-0020\): scope-escape' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:239:18` — write areas outside the project root were not refused.
- GREEN result: exit 0; `✓ ... TC-0018-0012 (TDD-0020): scope-escape`, 1 passed, 4 skipped.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (a write area that is absolute or normalizes to a path above the root is `scope-escape`, using `node:path`).

### TDD-0021

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts`
- Selector: `TC-0018-0012 (TDD-0021): unresolved-approval`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern='TC-0018-0012 \(TDD-0021\): unresolved-approval' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:254:18` — a `data-loss` risk signal with no question reached the CREATE question.
- GREEN result: exit 0; `✓ ... TC-0018-0012 (TDD-0021): unresolved-approval`, 1 passed, 5 skipped. `authorization-restored` asks nothing; `data-loss` is named.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (a material risk signal, any but `authorization-restored`, in a proposal with no question is `unresolved-approval`; linking a question to its signal is a marked simplification).

### TDD-0022

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts`
- Selector: `TC-0018-0012 (TDD-0022): stage-set`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern='TC-0018-0012 \(TDD-0022\): stage-set' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts:272:18` — a stage set omitting `implement` and `verify` and naming `deploy` was refused `invalid-input` without reasons.
- GREEN result: exit 0; `✓ ... TC-0018-0012 (TDD-0022): stage-set`, 1 passed, 6 skipped.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (the stage-set check names each `always` stage of the built-in plan the proposal omits, a missing `verify` on a change route, and each stage the plan lacks; it replaces the earlier `invalid-input` check on `verify` and `sdd`).

### TDD-0023

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts`
- Selector: `TC-0018-0013 (TDD-0023): A proposal failing unknown-id and stage-set at once`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern='TC-0018-0013 \(TDD-0023\): A proposal failing unknown-id and stage-set at once' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0016 and TDD-0022: every check adds to one `reasons[]` list.
- GREEN result: exit 0; `✓ ... TC-0018-0013 (TDD-0023): ...`, 1 passed, 8 skipped.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (no change beyond TDD-0022).

### TDD-0024

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts`
- Selector: `TC-0018-0014 (TDD-0024): A proposal failing unknown-id with confidence`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --testNamePattern='TC-0018-0014 \(TDD-0024\): A proposal failing unknown-id with confidence' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0016: no check reads `confidence`.
- GREEN result: exit 0; `✓ ... TC-0018-0014 (TDD-0024): ...`, 1 passed, 8 skipped. The refusal with `confidence: 1` equals the refusal without it.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (the proposal type admits the advisory `confidence`; no behaviour reads it).

### TDD-0025

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/normativeAndObservedReferencesStayApart.test.ts`
- Selector: `TC-0018-0015 (TDD-0025): Decide accept of a routing result with normative references, observed references and a new`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/normativeAndObservedReferencesStayApart.test.ts --testNamePattern='TC-0018-0015 \(TDD-0025\): Decide accept of a routing result with normative references, observed references and a new' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` in `tests/unit/workflow/normativeAndObservedReferencesStayApart.test.ts` — the create question opened with no authorization, but the verdict carried no plan, so both reference arrays were `undefined`.
- GREEN result: exit 0; `✓ ... TC-0018-0015 (TDD-0025): ...`, 1 passed. The plan holds the typed normative and observed arrays separately, one `create` question opens, and no authorization is recorded.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (`checkedPlan` builds the plan from the built-in plan and the proposal, keeping both typed reference arrays; the capability path returns it beside the questions). The test title is the ledger selector as written.

### TDD-0026

- Closed: `exception` under DR-0298 on 2026-09-25. The user waived the remaining per-row reviews; the T1 group review of BR-0018-0010 is not taken.

- TDD-ID: TDD-0026
- Layer: Unit
- Test file: `packages/qfai/tests/unit/workflow/qfaiRunDrivesTheStages.test.ts`
- Selector: `TC-0018-0016 (TDD-0026): direct`
- TC-ref: TC-0018-0016
- Owning module: `packages/qfai/src/core/workflow/decide.ts`
- qa-gatekeeper: PASS on re-observation at `working-tree+6c315802783d5ecf41d4fbdb29faf9dae2c0023cda08f96488d7f6c5904c6d7c`. The first review was REVISE because concurrent SDD edits moved the tree revision; the independent second review reproduced the RED, strip, restored hashes and 2,507-record revision.
- Round 1: qa-gatekeeper GREEN: PASS at `working-tree+36c3bc9944b5115612e5ed25cba03dfbb8d4bdce29aa70b7afb65c9d5524c97e`; independently reran the selector 1/1 and related suite 7/7, checked the target mutation's assertion failure and restored hashes, and recomputed the 2,507-record revision.
- Refactor decision: no code edit. The direct two-stage branch remains local while the other plan branches are still unimplemented; extracting a shared abstraction now would precede their behavior.
- Refactor verify command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --reporter=verbose` (cwd: `packages/qfai`).
- Refactor verify result: exit 0; six test files and seven tests passed. Cross-spec done-row path scan matched only spec-0018; no production reverse importer or cross-spec test consumer was found. Source/test SHA-256 stayed `fcff8d0cc26904fb5ef32c5cea46b189d1fc55025ddc01cdc839b431fe5492ed` and `c9ad89145f10f6472960dfa8bb5a4f193ff0ce14c5ac5bd927d3f65e5442b551`.
- Refactor verify revision: `working-tree+36c3bc9944b5115612e5ed25cba03dfbb8d4bdce29aa70b7afb65c9d5524c97e` (two calculations agreed; 2,507 path records). The BR-0018-0010 T1 group remains open with TDD-0027 through TDD-0030 at `todo`; this member will be reverified on group close before reviews.

#### Round 1

- Round 1: RED revision: `working-tree+bfdfb927eb18f1487e62acbb6130ca58deddf23dab2c3d7011f89fd26365e4cb` (two calculations agreed; 2,506 path records).
- Round 1: RED test hash: `c9ad89145f10f6472960dfa8bb5a4f193ff0ce14c5ac5bd927d3f65e5442b551`
- Seam file SHA-256: `7ae81e330477f88082308bd864fa27bb608cc43402c7199d6c73c75825f8de6e`
- Round 1: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0026\): direct' --reporter=verbose` (cwd: `packages/qfai`)
- Round 1: RED failure mode: assertion
- Round 1: RED result: exit 1; one selected test failed at `tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:153:18`. The feature-only `next` guard refuses the checked direct plan, so no maintenance or verify work order is issued, no result is accepted and final `next` is not successful. The selector expects the two ordered work orders with plan-defined executor skills and operations, a `spec-0018` target from the existing spec binding, two replayed accepted results, and a terminal `workOrder: null` with no events.
- Round 1: RED assertion-stripped result: Only the final comparison changed from `expect(actual).toEqual(expected)` to `void actual; void expected;`. The same selector passed 1/1 with exit 0 while all `decide` calls and operands still evaluated. The original assertion was restored, and the same selector failed again at `:153:18`; restored test hash `c9ad89145f10f6472960dfa8bb5a4f193ff0ce14c5ac5bd927d3f65e5442b551`.

```text
FAIL |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0026): direct
AssertionError: expected { Object (issued, acceptedStages, ...) } to deeply equal { Object (issued, acceptedStages, ...) }
- Expected
+ Received
-   "acceptedStages": Array [
-     Object { "stageInstanceId": "direct-edit", "stageKind": "maintenance", "outcome": "accepted" },
-     Object { "stageInstanceId": "direct-verify", "stageKind": "verify", "outcome": "accepted" },
-   ],
+   "acceptedStages": Array [],
-   "finalNextOk": true,
+   "finalNextOk": false,
-   "finalWorkOrder": null,
+   "finalWorkOrder": undefined,
-   "issued": Array [
+   "issued": Array [],
❯ tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:153:18
Test Files 1 failed (1); Tests 1 failed (1); exit 1
```

```diff
@@ -150,5 +150,6 @@ it("TC-0018-0016 (TDD-0026): direct", () => {
-  expect(actual).toEqual(expected);
+  void actual;
+  void expected;
 });
```

```text
✓ |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0026): direct
Test Files 1 passed (1); Tests 1 passed (1); exit 0
```

- Round 1: Oracle proof plan: After GREEN, temporarily alter the direct maintenance work order's `target.specId` while preserving stage progression. The same selector must fail on target mismatch. Restore the source and rerun the selector and reverse-import relevant suite.
- Round 1: RED re-observation revision: `working-tree+6c315802783d5ecf41d4fbdb29faf9dae2c0023cda08f96488d7f6c5904c6d7c` (two calculations agreed; 2,507 path records, after CR2/CR3/CR4 SDD reruns). The earlier `working-tree+bfdfb927eb18f1487e62acbb6130ca58deddf23dab2c3d7011f89fd26365e4cb` remains the first RED observation, not the current QA revision.
- Round 1: RED re-observation: the same selector command exited 1 at `:153:18`; actual `issued` and `acceptedStages` were empty, `finalNextOk` was false and `finalWorkOrder` was undefined. The assertion-only strip shown above passed 1/1 with exit 0. After restoring the original bytes, the selector exited 1 again at the same assertion. Restored source SHA-256: `7ae81e330477f88082308bd864fa27bb608cc43402c7199d6c73c75825f8de6e`; test SHA-256: `c9ad89145f10f6472960dfa8bb5a4f193ff0ce14c5ac5bd927d3f65e5442b551` (matching the backup). No GREEN edit was made.
- Round 1: Revision: `working-tree+36c3bc9944b5115612e5ed25cba03dfbb8d4bdce29aa70b7afb65c9d5524c97e` (two calculations agreed; 2,507 path records).
- Round 1: GREEN command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0026\): direct' --reporter=verbose` (cwd: `packages/qfai`).
- Round 1: GREEN result: exit 0; one selected test passed. The direct ready plan issues maintenance and verify orders in sequence with the plan's skill and operation and a `spec-0018` target from the checked spec binding. Both canned accepted results produce replayable result references; terminal `next` returns `workOrder: null`, state `ready` and no events. The six-file reverse-import related suite passed 7/7. Direct Prettier, ESLint and TypeScript checks passed. Restored source SHA-256: `fcff8d0cc26904fb5ef32c5cea46b189d1fc55025ddc01cdc839b431fe5492ed`; test SHA-256: `c9ad89145f10f6472960dfa8bb5a4f193ff0ce14c5ac5bd927d3f65e5442b551`.

```text
✓ |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0026): direct
Test Files 1 passed (1); Tests 1 passed (1); exit 0
```

- Round 1: Oracle command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0026\): direct' --reporter=verbose` (cwd: `packages/qfai`; the same selector command as GREEN).
- Round 1: Oracle proof: Temporarily changed the maintenance work order target from `spec-0018` to `spec-9999`, leaving the test unchanged. The oracle command exited 1 at `:153:18`: the issued maintenance target was wrong, `accept` refused it, and verify was not reached. The source was immediately restored. The selector passed 1/1 and the six-file related suite passed 7/7 again; source and test hashes returned to the GREEN values above.

```diff
-      nextWorkOrder.target = { kind: "spec", specId };
+      nextWorkOrder.target = {
+        kind: "spec",
+        specId: stage.stageKind === "maintenance" ? "spec-9999" : specId,
+      };
```

```text
FAIL |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0026): direct
AssertionError: expected { Object (issued, acceptedStages, ...) } to deeply equal { Object (issued, acceptedStages, ...) }
target.specId: expected "spec-0018", received "spec-9999"
❯ tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:153:18
Test Files 1 failed (1); Tests 1 failed (1); exit 1
```

```text
FAIL |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0026): direct
AssertionError: expected { Object (issued, acceptedStages, ...) } to deeply equal { Object (issued, acceptedStages, ...) }
❯ tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:153:18
Test Files 1 failed (1); Tests 1 failed (1); exit 1
```

```text
✓ |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0026): direct
Test Files 1 passed (1); Tests 1 passed (1); exit 0
```

### TDD-0027

- Closed: `exception` under DR-0298 on 2026-09-25. The user waived the remaining per-row reviews; the T1 group review of BR-0018-0010 is not taken.

- TDD-ID: TDD-0027
- Layer: Unit
- Test file: `packages/qfai/tests/unit/workflow/qfaiRunDrivesTheStages.test.ts`
- Selector: `TC-0018-0016 (TDD-0027): bugfix`
- TC-ref: TC-0018-0016
- Owning module: `packages/qfai/src/core/workflow/decide.ts`
- qa-gatekeeper: Round 1 RED record REVISE because the old S5 session-ending revision was not captured. Round 2 RED and GREEN PASS on the new invocation: the independent reviewer reproduced the RED assertion and comparison-only strip, then reran GREEN 1/1, related suite 8/8, predicate mutation failure and restored hashes/revision.

#### Round 1

- Round 1: RED revision: `working-tree+9b33eddcaffb7ed3738099e87d2fcfa2922eebb960271db26c5422cb6eb2d634` (two calculations agreed; 2,507 path records).
- Round 1: RED test hash: `de0dee75cde1a30425b275003e5989a302b2f10727576d3cc2af248851ee3bcf`
- Seam file SHA-256: `fcff8d0cc26904fb5ef32c5cea46b189d1fc55025ddc01cdc839b431fe5492ed` (no source seam edit required).
- Round 1: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0027\): bugfix' --reporter=verbose` (cwd: `packages/qfai`).
- Round 1: RED failure mode: assertion.
- Round 1: RED result: exit 1; one selected test failed at `tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:393:18` (one sibling skipped). The current core refuses the bugfix plan before issuing a work order: `issued` and `acceptedStages` are empty, the diagnosis and regression control are null, final `next` is not successful and `workOrder` is undefined. The selector expects the replayed `missing-test` diagnosis to select `sdd_append`, then the Integration fixture's acceptance branch, implementation and verification, with the plan's skill/operation and the checked spec target on all five work orders. A regression diagnosis is a control expected to select `regression_fix`.
- Round 1: RED assertion-stripped result: Only the final comparison changed from `expect(actual).toEqual(expected)` to `void actual; void expected;`. The same selector passed 1/1 (one sibling skipped), then the original assertion was restored and failed again at `:393:18`. The direct sibling passed 1/1. The restored test hash matched its backup and direct Prettier, ESLint and TypeScript checks passed.

```diff
@@ -390,5 +390,6 @@ it("TC-0018-0016 (TDD-0027): bugfix", () => {
-  expect(actual).toEqual(expected);
+  void actual;
+  void expected;
 });
```

```text
FAIL |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0027): bugfix
AssertionError: expected { Object (issued, acceptedStages, ...) } to deeply equal { issued: [ { ...(5) }, ...(4) ], ...(8) }
❯ tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:393:18
Test Files 1 failed (1); Tests 1 failed (1), 1 skipped; exit 1
```

```text
✓ |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0027): bugfix
Test Files 1 passed (1); Tests 1 passed (1), 1 skipped; exit 0
```

- Round 1: Oracle proof plan: After GREEN, temporarily remove the `missing-test` predicate's effect while preserving the accepted diagnosis record. The same selector must fail because `sdd_append` is skipped or a different branch issues. Restore the source, rerun the selector and the reverse-import relevant suite, and compare hashes.

#### Round 2

- Round 2: Session-end revision: `working-tree+fcd40b3cb714bc7fbd4e1849a338e128cb85421ad54c782de859160324a64245` (S1 ended at `2026-09-24T20:26:22.776Z`, two calculations agreed; 2,507 path records). First test edit after the session: `2026-09-24T20:27:01.140Z`.
- Round 2: RED revision: `working-tree+0393c1ffec3ede3d4f223ed2c3374eddbd35881187da6a0a041eca86d95ea6f6` (two calculations agreed; 2,507 path records).
- Round 2: RED test hash: `59e731baf1aae7b9661a1a1f267449c2d3c8f06e869102ef554fe57800adcb27`
- Seam file SHA-256: `fcff8d0cc26904fb5ef32c5cea46b189d1fc55025ddc01cdc839b431fe5492ed` (source unchanged).
- Round 2: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0027\): bugfix' --reporter=verbose` (cwd: `packages/qfai`).
- Round 2: RED failure mode: assertion.
- Round 2: RED result: exit 1; the selected test failed at `tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:376:18` (one sibling skipped). The core issued no bugfix work order, accepted no stage, replayed no diagnosis and returned no final work order. The selector now asserts only the missing-test branch's five work orders and terminal null; the regression control was removed because its obligation belongs to TC-0018-0067.
- Round 2: RED assertion-stripped result: The final comparison alone changed from `expect(actual).toEqual(expected)` to `void actual; void expected;`. The same selector passed 1/1 (one sibling skipped); after restoration, the same command failed at `:376:18` again. The direct sibling passed 1/1. The restored test hash matched the backup; direct Prettier, ESLint and TypeScript checks passed.

```diff
@@ -373,5 +373,6 @@ it("TC-0018-0016 (TDD-0027): bugfix", () => {
-  expect(actual).toEqual(expected);
+  void actual;
+  void expected;
 });
```

```text
FAIL |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0027): bugfix
AssertionError: expected { Object (issued, acceptedStages, ...) } to deeply equal { issued: [ { ...(5) }, ...(4) ], ...(7) }
❯ tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:376:18
Test Files 1 failed (1); Tests 1 failed (1), 1 skipped; exit 1
```

```text
✓ |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0027): bugfix
Test Files 1 passed (1); Tests 1 passed (1), 1 skipped; exit 0
```

- Round 2: Oracle proof plan: After GREEN, temporarily remove the `missing-test` predicate's effect while preserving the accepted diagnosis record. The same selector must fail because `sdd_append` is skipped or a different stage issues. Restore the source, rerun the selector and reverse-import relevant suite, and compare hashes.
- Round 2: Revision: `working-tree+2b4fbf814c2df27db7b18cfceed4b84c50572b68a19a4dc2216e4437ff532428` (two calculations agreed; 2,507 path records).
- Round 2: GREEN command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0027\): bugfix' --reporter=verbose` (cwd: `packages/qfai`).
- Round 2: GREEN result: exit 0; one selected test passed and one sibling skipped. The bugfix plan evaluates the accepted `missing-test` diagnosis and Integration acceptance fact, issues five ordered work orders with plan skill/operation and the checked spec target, accepts and replays each result, and returns null after verification. The reverse-import relevant suite passed six files and eight tests. Direct Prettier, ESLint and TypeScript checks passed. Restored source SHA-256: `d99294bc89dc828c2d1e4cde13fbeb00e4a1ab99ea0993846bb3766595b9a6f7`; test SHA-256: `59e731baf1aae7b9661a1a1f267449c2d3c8f06e869102ef554fe57800adcb27`.
- Round 2: Relevant suite command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --reporter=verbose` (cwd: `packages/qfai`); exit 0, Test Files 6 passed, Tests 8 passed.
- Round 2: Oracle command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0027\): bugfix' --reporter=verbose` (cwd: `packages/qfai`; the same selector command as GREEN).
- Round 2: Oracle proof: Temporarily changed only `case "missing_test_row_needed"` from `return diagnosis?.verdict === "missing-test";` to `return false;`. The selector exited 1 at `:376:18`, missing the `sdd_append`, `acceptance` and `implement` work orders. The source was restored immediately; the same selector passed 1/1, the related suite passed 8/8, and source/test hashes returned to the values above.
- Refactor decision: no code edit. `activeStages` is shared by `next` and `accept`; another abstraction before the remaining bugfix branches are implemented would add no needed behavior.
- Refactor verify command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts tests/unit/workflow/oneCreateQuestionAtRouting.test.ts tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts tests/unit/workflow/oneApprovalPerCapability.test.ts tests/unit/workflow/aDeclineIsAStopWithNothingTracked.test.ts tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts --reporter=verbose` (cwd: `packages/qfai`).
- Refactor verify result: exit 0; six test files and eight tests passed. Other specs' done rows have no direct ownership of the source or test; reverse imports found six workflow unit files and no importer of the test file. Source/test SHA-256 stayed `d99294bc89dc828c2d1e4cde13fbeb00e4a1ab99ea0993846bb3766595b9a6f7` and `59e731baf1aae7b9661a1a1f267449c2d3c8f06e869102ef554fe57800adcb27`.
- Refactor verify revision: `working-tree+2b4fbf814c2df27db7b18cfceed4b84c50572b68a19a4dc2216e4437ff532428` (two calculations agreed; 2,507 path records). BR-0018-0010 remains open with TDD-0028 through TDD-0030 at `todo`; this member will be reverified on group close before reviews.

```diff
 case "missing_test_row_needed":
-  return diagnosis?.verdict === "missing-test";
+  return false;
```

```text
✓ |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0027): bugfix
Test Files 1 passed (1); Tests 1 passed, 1 skipped (2); exit 0
```

```text
× |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0027): bugfix
AssertionError: expected { Object (issued, acceptedStages, ...) } to deeply equal { issued: [ { ...(5) }, ...(4) ], ...(7) }
❯ tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:376:18
Test Files 1 failed (1); Tests 1 failed, 1 skipped (2); exit 1
```

### TDD-0028

- Closed: `exception` under DR-0298 on 2026-09-25. The user waived the remaining per-row reviews; the T1 group review of BR-0018-0010 is not taken.

- TDD-ID: TDD-0028
- Layer: Unit
- Test file: `packages/qfai/tests/unit/workflow/qfaiRunDrivesTheStages.test.ts`
- Selector: `TC-0018-0016 (TDD-0028): bounded-change`
- TC-ref: TC-0018-0016
- Owning module: `packages/qfai/src/core/workflow/decide.ts`
- qa-gatekeeper: Round 1 RED PASS. Independent review reproduced assertion failure at `:326:18`, comparison-only strip PASS, restored RED and siblings 2/2. Source/test hashes and 2,507-record revision matched. Round 1 GREEN PASS on re-submission: the first GREEN submission was REVISE because its revision was taken while another writer was active; the re-taken GREEN and Oracle proof at `working-tree+dbfcb0e40e33b4026bb18ec253a6187909be459f333a64eaa56ab4ee21145ef8` (HEAD `0ee5c1781`) were reproduced independently, audited evidence hash `3cd044616305c6bd71c61772ef5c417193de23230556f1e73be678f633836529`. Group reviews remain pending.
- Group status: BR-0018-0010 remains open; group reviews and done gate wait for TDD-0029 and TDD-0030.

#### Round 1

- Round 1: RED revision: `working-tree+64323366ff1e44571a24c3819ce0c836a78657ddbe84f8f1d5a3275427680fa6` (two calculations agreed; 2,507 path records).
- Round 1: RED test hash: `efbfba64528939ae5faba7a18b44174d4bd76361b524c1a137edc9c377e7d872`.
- Round 1: Source seam SHA-256: `d99294bc89dc828c2d1e4cde13fbeb00e4a1ab99ea0993846bb3766595b9a6f7` (unchanged).
- Round 1: RED command: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0028\): bounded-change' --reporter=verbose` (cwd: `packages/qfai`).
- Round 1: RED failure mode: assertion.
- Round 1: RED result: exit 1; one failed, two skipped. The final comparison at `tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:326:18` failed. The core issued no work orders, accepted no stages, and returned no successful final `next`; the fixture expects four ordered work orders from the provided plan and a fifth `next` with a null work order.
- Round 1: RED assertion-stripped result: Replaced the final `expect(actual).toEqual(expected);` with `void actual; void expected;`, preserving the constructed operands, `decide` calls and fixture. The same command passed one selector with two siblings skipped. After restoring the assertion, the same command failed again at `:326:18`; the restored test hash matched. The direct and bugfix sibling selectors passed 2/2. Direct Prettier, ESLint and TypeScript checks passed.
- Round 1: Oracle proof plan: Once GREEN, temporarily make `acceptance_obligations_unmet` evaluate false for the bounded-change plan. The missing acceptance work order must fail the same selector: `node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0028\): bounded-change' --reporter=verbose` (cwd: `packages/qfai`). Restore the source and rerun that selector and the relevant suite.

```diff
-  expect(actual).toEqual(expected);
+  void actual;
+  void expected;
```

```text
× |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0028): bounded-change
AssertionError: expected { Object (issued, acceptedStages, ...) } to deeply equal { issued: [ { …(5) }, …(3) ], …(6) }
❯ tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:326:18
Test Files 1 failed (1); Tests 1 failed, 2 skipped (3); exit 1
```

```text
✓ |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0028): bounded-change
Test Files 1 passed (1); Tests 1 passed, 2 skipped (3); exit 0
```

- Round 1: Revision: `working-tree+dbfcb0e40e33b4026bb18ec253a6187909be459f333a64eaa56ab4ee21145ef8` at HEAD `0ee5c1781f6b808ec1ed0cc4a78e90809f5ef196` (two calculations agreed; 2,507 path records). It is the tree the restored GREEN ran on, taken straight after that run.
- Round 1: GREEN command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0028\): bounded-change' --reporter=verbose` (cwd: `packages/qfai`).
- Round 1: GREEN result: exit 0; one selected test passed and two siblings skipped. The bounded-change plan issues four ordered work orders with the plan's skill and operation and the checked spec target. `bounded-acceptance` is issued because `acceptanceObligationsUnmet` is true. Each result is accepted and replayed, and a fifth `next` returns a null work order. Direct Prettier and ESLint on both files passed. `tsc -p packages/qfai/tsconfig.json --noEmit` exits 1 with TS2322 at `decide.ts(197,7)`: the CREATE decision branch assigns `snapshot.scopeDigest`, typed `string | undefined`, to a `string`. That line is outside this row's change. Source SHA-256: `a49294c3ca11f8dde947869eba0ee42f9da2223556e81d2e33b1011e038c367e`; test SHA-256: `efbfba64528939ae5faba7a18b44174d4bd76361b524c1a137edc9c377e7d872`.
- Round 1: Relevant suite command: not run in this observation; Refactor step 2 runs it.
- Round 1: Oracle command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0028\): bounded-change' --reporter=verbose` (cwd: `packages/qfai`; the same selector command as GREEN).
- Round 1: Oracle proof: One line in `activeStages` was changed temporarily, in `case "acceptance_obligations_unmet"`. It went from `return acceptanceObligationsUnmet === true;` to `return plan.route !== "bounded-change" && acceptanceObligationsUnmet === true;`. The predicate then evaluates false for the bounded-change plan and is unchanged for bugfix. The selector exited 1 at `:326:18`: `bounded-acceptance` was missing from both `issued` and `acceptedStages`, leaving three work orders instead of four. The source was restored at once from a byte copy. The same selector then passed 1/1, and the source SHA-256 returned to the value above.

```diff
       case "acceptance_obligations_unmet":
-        return acceptanceObligationsUnmet === true;
+        return plan.route !== "bounded-change" && acceptanceObligationsUnmet === true;
```

```text
✓ |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0028): bounded-change
Test Files 1 passed (1); Tests 1 passed | 2 skipped (3); exit 0
```

```text
× |unit| tests/unit/workflow/qfaiRunDrivesTheStages.test.ts > TC-0018-0016 (TDD-0028): bounded-change
  → expected { issued: [ { …(5) }, …(2) ], …(6) } to deeply equal { issued: [ { …(5) }, …(3) ], …(6) }
AssertionError: expected { issued: [ { …(5) }, …(2) ], …(6) } to deeply equal { issued: [ { …(5) }, …(3) ], …(6) }
❯ tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:326:18
Test Files 1 failed (1); Tests 1 failed | 2 skipped (3); exit 1
```

### TDD-0029

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/qfaiRunDrivesTheStages.test.ts`
- Selector: `TC-0018-0016 (TDD-0029): feature`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0029\): feature' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:665:18` — all four feature work orders were issued in order but each carried `skill: undefined` and `operation: undefined`.
- GREEN result: exit 0; `✓ ... TC-0018-0016 (TDD-0029): feature`, 1 passed, 3 skipped. Four work orders name the plan's skill and operation in order, each result is accepted, and a fifth `next` returns `workOrder: null`.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (every issued work order copies `executor.skill` and `operation` from its plan stage).

### TDD-0030

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/qfaiRunDrivesTheStages.test.ts`
- Selector: `TC-0018-0016 (TDD-0030): discovery`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/qfaiRunDrivesTheStages.test.ts --testNamePattern='TC-0018-0016 \(TDD-0030\): discovery' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/qfaiRunDrivesTheStages.test.ts:699:18` — `next` refused the discovery plan, so nothing was issued and the run stayed `ready`.
- GREEN result: exit 0; `✓ ... TC-0018-0016 (TDD-0030): discovery`, 1 passed, 4 skipped. The `discussion` work order names `qfai-discussion` / `resolve-unsettled-product-scope`; accepting its result fires `scope-or-obligation-revision` and returns the run to `routing`. The other four plan selectors still pass after the route checks moved into `routePlanIsInvalid`.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (`routePlanIsInvalid` holds the per-route plan checks and accepts a discovery plan whose stages name a skill and operation; `accept` of the last discovery stage moves `running` to `routing`; feature and discovery stage predicates stay unevaluated under a marked simplification).

### TDD-0031

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/nextRepeatsAnUnansweredWorkOrder.test.ts`
- Selector: `TC-0018-0018 (TDD-0031): next twice on a run in running, then resume twice, with no result between`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/nextRepeatsAnUnansweredWorkOrder.test.ts --testNamePattern='TC-0018-0018 \(TDD-0031\): next twice on a run in running, then resume twice, with no result between' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(...).toEqual(...)` at `tests/unit/workflow/nextRepeatsAnUnansweredWorkOrder.test.ts:43:52` — `next` and `resume` on a run in `running` returned no work order.
- GREEN result: exit 0; `✓ ... TC-0018-0018 (TDD-0031): ...`, 1 passed. All four calls return `work-order-direct-edit-1`.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (`next` in `running` returns the outstanding work order and publishes nothing; `resume` in `running` fires the interruption, reconcile and dispatch edges and returns the same work order; its missing revalidation is a marked simplification).

### TDD-0032

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aSkippedStageIsNeverAPass.test.ts`
- Selector: `TC-0018-0021 (TDD-0032): Decide accept of a result with notRun`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aSkippedStageIsNeverAPass.test.ts --testNamePattern='TC-0018-0021 \(TDD-0032\): Decide accept of a result with notRun' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(...)` at `tests/unit/workflow/aSkippedStageIsNeverAPass.test.ts:64:18` — the accepted event carried no `notRun`, so the stage's reason was not recorded.
- GREEN result: exit 0; `✓ ... TC-0018-0021 (TDD-0032): ...`, 1 passed. The accepted event records `notRun` with its reason, and no `receipt-recorded` event is published.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (the accepted stage event carries the result's `notRun`).

### TDD-0033

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aSkippedStageIsNeverAPass.test.ts`
- Selector: `TC-0018-0022 (TDD-0033): A result with notRun and no reason`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aSkippedStageIsNeverAPass.test.ts --testNamePattern='TC-0018-0022 \(TDD-0033\): A result with notRun and no reason' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `toEqual(refusedInput("skip-unexplained"))` at `tests/unit/workflow/aSkippedStageIsNeverAPass.test.ts:93:53` — a `not_applicable` skip with no reason was accepted.
- GREEN result: exit 0; `✓ ... TC-0018-0022 (TDD-0033): ...`, 1 passed, 1 skipped. `invalid-input` / `skip-unexplained`; state `running`, no events.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (`notRunRefusalOf` refuses a `not_applicable` entry with no reason; `invalid-input` now carries `reasons[]`).

### TDD-0034

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aSkippedStageIsNeverAPass.test.ts`
- Selector: `TC-0018-0023 (TDD-0034): A result with notRun`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aSkippedStageIsNeverAPass.test.ts --testNamePattern='TC-0018-0023 \(TDD-0034\): A result with notRun' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `toEqual(refusedInput("reuse-stale"))` at `tests/unit/workflow/aSkippedStageIsNeverAPass.test.ts:101:5` — a reuse naming a receipt classed `stale` was accepted.
- GREEN result: exit 0; `✓ ... TC-0018-0023 (TDD-0034): A result with notRun`, 1 passed, 2 skipped.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (a `reused` entry whose receipt is not classed `valid` in `facts.receiptValidity` is `reuse-stale`; `unknown` counts as not valid).

### TDD-0035

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/finishObservesValidateItself.test.ts`
- Selector: `TC-0018-0031 (TDD-0035): A result whose gateResults claims a PASS for a gate`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/finishObservesValidateItself.test.ts --testNamePattern='TC-0018-0031 \(TDD-0035\): A result whose gateResults claims a PASS for a gate' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected undefined to deeply equal [ { gateId: 'validate', …(2) } ]` at `tests/unit/workflow/finishObservesValidateItself.test.ts:55`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/finishObservesValidateItself.test.ts > TC-0018-0031 (TDD-0035): A result whose gateResults claims a PASS for a gate`
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Note: the selector is rewritten from the case's former input, which `CR-20260925-0006` replaced with a claimed PASS in `gateResults`.

- Note: `finish` reads a `completion` fact — the in-process validate findings with the project's `failOn`, the offered verify report, the tool version, the CLI entry and policy digests, and the run's cumulative changed and uncommitted paths — and the snapshot's `completionTarget` and `start` `baseline`. An accepted stage entry gains `gateResults`, `reviewResults` and `debts`. `accept` records a submitted gate verdict as `agent_reported` on its event; `finish` returns its own validate receipt as `cli_observed` and decides the validate gate from it alone.

### TDD-0036

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/onlyThisRunSVerifyReportCounts.test.ts`
- Selector: `TC-0018-0033 (TDD-0036): Decide finish on a run with no accepted verify stage`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/onlyThisRunSVerifyReportCounts.test.ts --testNamePattern='TC-0018-0033 \(TDD-0036\): Decide finish on a run with no accepted verify stage' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { …(3) } ]` at `tests/unit/workflow/onlyThisRunSVerifyReportCounts.test.ts:16`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/onlyThisRunSVerifyReportCounts.test.ts > TC-0018-0033 (TDD-0036): Decide finish on a run with no accepted verify stage`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0037

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/anIndependentQaGatekeeperPass.test.ts`
- Selector: `TC-0018-0034 (TDD-0037): Decide finish where the only qa-gatekeeper PASS comes from an instance the actor history s`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/anIndependentQaGatekeeperPass.test.ts --testNamePattern='TC-0018-0034 \(TDD-0037\): Decide finish where the only qa-gatekeeper PASS comes from an instance the actor history s' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { …(3) } ]` at `tests/unit/workflow/anIndependentQaGatekeeperPass.test.ts:19`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/anIndependentQaGatekeeperPass.test.ts > TC-0018-0034 (TDD-0037): Decide finish where the only qa-gatekeeper PASS comes from an instance the actor history shows as an author`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0038

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/onlyFinishCompletesFromReady.test.ts`
- Selector: `TC-0018-0035 (TDD-0038): obligation-unprocessed`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/onlyFinishCompletesFromReady.test.ts --testNamePattern='TC-0018-0035 \(TDD-0038\): obligation-unprocessed' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { …(3) } ]` at `tests/unit/workflow/onlyFinishCompletesFromReady.test.ts:199`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/onlyFinishCompletesFromReady.test.ts > TC-0018-0035 (TDD-0038): obligation-unprocessed`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0039

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/onlyFinishCompletesFromReady.test.ts`
- Selector: `TC-0018-0035 (TDD-0039): stage-unaccepted`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/onlyFinishCompletesFromReady.test.ts --testNamePattern='TC-0018-0035 \(TDD-0039\): stage-unaccepted' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { …(3) } ]` at `tests/unit/workflow/onlyFinishCompletesFromReady.test.ts:199`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/onlyFinishCompletesFromReady.test.ts > TC-0018-0035 (TDD-0039): stage-unaccepted`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0040

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/onlyFinishCompletesFromReady.test.ts`
- Selector: `TC-0018-0035 (TDD-0040): review-missing`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/onlyFinishCompletesFromReady.test.ts --testNamePattern='TC-0018-0035 \(TDD-0040\): review-missing' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { …(3) } ]` at `tests/unit/workflow/onlyFinishCompletesFromReady.test.ts:199`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/onlyFinishCompletesFromReady.test.ts > TC-0018-0035 (TDD-0040): review-missing`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0041

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/onlyFinishCompletesFromReady.test.ts`
- Selector: `TC-0018-0035 (TDD-0041): verify-missing`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/onlyFinishCompletesFromReady.test.ts --testNamePattern='TC-0018-0035 \(TDD-0041\): verify-missing' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { …(3) } ]` at `tests/unit/workflow/onlyFinishCompletesFromReady.test.ts:199`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/onlyFinishCompletesFromReady.test.ts > TC-0018-0035 (TDD-0041): verify-missing`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0042

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/onlyFinishCompletesFromReady.test.ts`
- Selector: `TC-0018-0035 (TDD-0042): verify-foreign`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/onlyFinishCompletesFromReady.test.ts --testNamePattern='TC-0018-0035 \(TDD-0042\): verify-foreign' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { …(3) } ]` at `tests/unit/workflow/onlyFinishCompletesFromReady.test.ts:199`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/onlyFinishCompletesFromReady.test.ts > TC-0018-0035 (TDD-0042): verify-foreign`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0043

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/onlyFinishCompletesFromReady.test.ts`
- Selector: `TC-0018-0035 (TDD-0043): gate-failed`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/onlyFinishCompletesFromReady.test.ts --testNamePattern='TC-0018-0035 \(TDD-0043\): gate-failed' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { condition: 'gate-failed', …(2) } ]` at `tests/unit/workflow/onlyFinishCompletesFromReady.test.ts:199`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/onlyFinishCompletesFromReady.test.ts > TC-0018-0035 (TDD-0043): gate-failed`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0044

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/onlyFinishCompletesFromReady.test.ts`
- Selector: `TC-0018-0035 (TDD-0044): diff-out-of-scope`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/onlyFinishCompletesFromReady.test.ts --testNamePattern='TC-0018-0035 \(TDD-0044\): diff-out-of-scope' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { …(3) } ]` at `tests/unit/workflow/onlyFinishCompletesFromReady.test.ts:199`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/onlyFinishCompletesFromReady.test.ts > TC-0018-0035 (TDD-0044): diff-out-of-scope`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

- Note: the authorized set for `diff-out-of-scope` is the plan's write scope plus `.qfai/evidence/workflow/<runId>/`, marked `SIMPLIFIED` in `decide.ts` until the snapshot records every issued work order's record areas.

### TDD-0045

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/onlyFinishCompletesFromReady.test.ts`
- Selector: `TC-0018-0035 (TDD-0045): approval-unanswered`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/onlyFinishCompletesFromReady.test.ts --testNamePattern='TC-0018-0035 \(TDD-0045\): approval-unanswered' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { …(3) } ]` at `tests/unit/workflow/onlyFinishCompletesFromReady.test.ts:199`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/onlyFinishCompletesFromReady.test.ts > TC-0018-0035 (TDD-0045): approval-unanswered`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0046

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/onlyFinishCompletesFromReady.test.ts`
- Selector: `TC-0018-0035 (TDD-0046): debt-open`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/onlyFinishCompletesFromReady.test.ts --testNamePattern='TC-0018-0035 \(TDD-0046\): debt-open' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { condition: 'debt-open', …(2) } ]` at `tests/unit/workflow/onlyFinishCompletesFromReady.test.ts:199`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/onlyFinishCompletesFromReady.test.ts > TC-0018-0035 (TDD-0046): debt-open`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

- Note: a debt is resolved when the `finish` validate no longer reports its finding code at its path. Resolution by a later accepted result of the detecting stage kind is marked `SIMPLIFIED` in `decide.ts` until an accepted result's own findings are recorded beside its stage.

### TDD-0047

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/onlyFinishCompletesFromReady.test.ts`
- Selector: `TC-0018-0035 (TDD-0047): tool-drift`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/onlyFinishCompletesFromReady.test.ts --testNamePattern='TC-0018-0035 \(TDD-0047\): tool-drift' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { condition: 'tool-drift', …(2) } ]` at `tests/unit/workflow/onlyFinishCompletesFromReady.test.ts:199`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/onlyFinishCompletesFromReady.test.ts > TC-0018-0035 (TDD-0047): tool-drift`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0048

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/onlyFinishCompletesFromReady.test.ts`
- Selector: `TC-0018-0035 (TDD-0048): policy-drift`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/onlyFinishCompletesFromReady.test.ts --testNamePattern='TC-0018-0035 \(TDD-0048\): policy-drift' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { condition: 'policy-drift', …(2) } ]` at `tests/unit/workflow/onlyFinishCompletesFromReady.test.ts:199`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/onlyFinishCompletesFromReady.test.ts > TC-0018-0035 (TDD-0048): policy-drift`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0049

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/onlyFinishCompletesFromReady.test.ts`
- Selector: `TC-0018-0035 (TDD-0049): run-waiting`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/onlyFinishCompletesFromReady.test.ts --testNamePattern='TC-0018-0035 \(TDD-0049\): run-waiting' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { condition: 'run-waiting', …(2) } ]` at `tests/unit/workflow/onlyFinishCompletesFromReady.test.ts:199`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/onlyFinishCompletesFromReady.test.ts > TC-0018-0035 (TDD-0049): run-waiting`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

- Note: `run-waiting` names each open question on a run in `awaiting_input`. A `blocked` run is named by its state, marked `SIMPLIFIED` in `decide.ts` until the snapshot carries the cause or blocker.

### TDD-0050

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/onlyFinishCompletesFromReady.test.ts`
- Selector: `TC-0018-0036 (TDD-0050): Decide finish on a run in ready whose facts meet every condition`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/onlyFinishCompletesFromReady.test.ts --testNamePattern='TC-0018-0036 \(TDD-0050\): Decide finish on a run in ready whose facts meet every condition' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { ok: true, run: { …(3) }, …(2) } to deeply equal { ok: true, run: { …(3) }, …(3) }` at `tests/unit/workflow/onlyFinishCompletesFromReady.test.ts:208`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/onlyFinishCompletesFromReady.test.ts > TC-0018-0036 (TDD-0050): Decide finish on a run in ready whose facts meet every condition`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0051

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/findingsAreReportedAgainstTheStartBaseline.test.ts`
- Selector: `TC-0018-0037 (TDD-0051): A start baseline with one error, and finish facts holding it and one new error`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/findingsAreReportedAgainstTheStartBaseline.test.ts --testNamePattern='TC-0018-0037 \(TDD-0051\): A start baseline with one error, and finish facts holding it and one new error' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0035: the validate gate it added classes each finding against the baseline by its code, file and sorted refs.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/findingsAreReportedAgainstTheStartBaseline.test.ts > TC-0018-0037 (TDD-0051): A start baseline with one error, and finish facts holding it and one new error`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0052

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/findingsAreReportedAgainstTheStartBaseline.test.ts`
- Selector: `TC-0018-0038 (TDD-0052): A finish finding with the baseline's code and file and its refs in another order`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/findingsAreReportedAgainstTheStartBaseline.test.ts --testNamePattern='TC-0018-0038 \(TDD-0052\): A finish finding with the baseline's code and file and its refs in another order' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0035: the validate gate it added classes each finding against the baseline by its code, file and sorted refs.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/findingsAreReportedAgainstTheStartBaseline.test.ts > TC-0018-0038 (TDD-0052): A finish finding with the baseline's code and file and its refs in another order`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0053

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theTargetIsFixedAtStart.test.ts`
- Selector: `TC-0018-0040 (TDD-0053): Decide finish on a working_tree run whose conditions hold except uncommitted`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theTargetIsFixedAtStart.test.ts --testNamePattern='TC-0018-0040 \(TDD-0053\): Decide finish on a working_tree run whose conditions hold except uncommitted' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { id: 'run-20260925000000001', …(2) } to deeply equal { id: 'run-20260925000000001', …(2) }` at `tests/unit/workflow/theTargetIsFixedAtStart.test.ts:25`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/theTargetIsFixedAtStart.test.ts > TC-0018-0040 (TDD-0053): Decide finish on a working_tree run whose conditions hold except uncommitted`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0054

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theTargetIsFixedAtStart.test.ts`
- Selector: `TC-0018-0041 (TDD-0054): Decide finish on a qfai_done run whose only unmet condition is uncommitted`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theTargetIsFixedAtStart.test.ts --testNamePattern='TC-0018-0041 \(TDD-0054\): Decide finish on a qfai_done run whose only unmet condition is uncommitted' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { condition: 'uncommitted', …(2) } ]` at `tests/unit/workflow/theTargetIsFixedAtStart.test.ts:38`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/theTargetIsFixedAtStart.test.ts > TC-0018-0041 (TDD-0054): Decide finish on a qfai_done run whose only unmet condition is uncommitted`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0055

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/debtBlocksCompletion.test.ts`
- Selector: `TC-0018-0043 (TDD-0055): Decide accept of an accepted_with_debt result whose debt names another spec as owningSpec`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/debtBlocksCompletion.test.ts --testNamePattern='TC-0018-0043 \(TDD-0055\): Decide accept of an accepted_with_debt result whose debt names another spec as owningSpec' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected undefined to deeply equal [ { …(7) } ]` at `tests/unit/workflow/debtBlocksCompletion.test.ts:143`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/debtBlocksCompletion.test.ts > TC-0018-0043 (TDD-0055): Decide accept of an accepted_with_debt result whose debt names another spec as owningSpec and qfai-sdd as resolvingOwner, then finish while the finding still stands`
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Note: the selector is rewritten from the case's former input, which `CR-20260925-0006` replaced with another spec as `owningSpec` and `qfai-sdd` as `resolvingOwner`.

### TDD-0056

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/debtBlocksCompletion.test.ts`
- Selector: `TC-0018-0044 (TDD-0056): A result with a debt that has no resolvingOwner`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/debtBlocksCompletion.test.ts --testNamePattern='TC-0018-0044 \(TDD-0056\): A result with a debt that has no resolvingOwner' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { ok: false, …(4) } to deeply equal { ok: false, …(4) }` at `tests/unit/workflow/debtBlocksCompletion.test.ts:74:18`; the core refused the `accepted_with_debt` outcome with no reasons
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/debtBlocksCompletion.test.ts > TC-0018-0044 (TDD-0056): A result with a debt that has no resolvingOwner`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0057

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theSeamOnlyRoundTrip.test.ts`
- Selector: `TC-0018-0045 (TDD-0057): An acceptance result with seamRequest and outcome needs_repair`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theSeamOnlyRoundTrip.test.ts --testNamePattern='TC-0018-0045 \(TDD-0057\): An acceptance result with seamRequest and outcome needs_repair' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { repairState: 'running', …(3) } to deeply equal { repairState: 'ready', …(3) }` at `tests/unit/workflow/theSeamOnlyRoundTrip.test.ts:139:6`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/theSeamOnlyRoundTrip.test.ts > TC-0018-0045 (TDD-0057): An acceptance result with seamRequest and outcome needs_repair`
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Design choice: the snapshot carries the open seam request as `seamRequest` (the acceptance work order it returns to, that stage instance, its attempt and the target test) and the last issued attempt per stage instance as `attempts`. While `seamRequest` is set, `next` issues the seam-only work order: stage kind `implement`, skill `qfai-implement`, operation `seam-only`, `parentWorkOrderId` naming the acceptance work order. Once the snapshot no longer holds it, `next` reissues the acceptance stage instance at the next attempt. How the journal replays into those two fields belongs to persistence.

### TDD-0058

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aSeamNeverPassesTheAssertion.test.ts`
- Selector: `TC-0018-0046 (TDD-0058): A seam-only result whose seam`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aSeamNeverPassesTheAssertion.test.ts --testNamePattern='TC-0018-0046 \(TDD-0058\): A seam-only result whose seam' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { …(4) } to deeply equal { …(4) }` at `tests/unit/workflow/aSeamNeverPassesTheAssertion.test.ts:80:6`; the seam-only result observing `pass` was accepted
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aSeamNeverPassesTheAssertion.test.ts > TC-0018-0046 (TDD-0058): A seam-only result whose seam`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0059

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts`
- Selector: `TC-0018-0047 (TDD-0059): An acceptance result with testObservation`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts --testNamePattern='TC-0018-0047 \(TDD-0059\): An acceptance result with testObservation' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run; already satisfied by TDD-0028, whose bounded-change stage driving accepts an acceptance result and issues implement next
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts > TC-0018-0047 (TDD-0059): An acceptance result with testObservation`
- Production files: none; the test adds the `testObservation` and `red` result fields to the input type in `packages/qfai/src/core/workflow/decide.ts`

### TDD-0060

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts`
- Selector: `TC-0018-0048 (TDD-0060): collection`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts --testNamePattern='TC-0018-0048 \(TDD-0060\): collection' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'ready', …(3) } to deeply equal { state: 'running', …(3) }` at `tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts:121:29`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts > TC-0018-0048 (TDD-0060): collection`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0061

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts`
- Selector: `TC-0018-0048 (TDD-0061): import`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts --testNamePattern='TC-0018-0048 \(TDD-0061\): import' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'ready', …(3) } to deeply equal { state: 'running', …(3) }` at `tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts:126:29`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts > TC-0018-0048 (TDD-0061): import`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0062

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts`
- Selector: `TC-0018-0048 (TDD-0062): startup`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts --testNamePattern='TC-0018-0048 \(TDD-0062\): startup' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'ready', …(3) } to deeply equal { state: 'running', …(3) }` at `tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts:131:29`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts > TC-0018-0048 (TDD-0062): startup`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0063

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts`
- Selector: `TC-0018-0048 (TDD-0063): timeout`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts --testNamePattern='TC-0018-0048 \(TDD-0063\): timeout' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'ready', …(3) } to deeply equal { state: 'running', …(3) }` at `tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts:136:29`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/onlyAnAssertionFailureIsRed.test.ts > TC-0018-0048 (TDD-0063): timeout`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0064

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/outcomeAndObservationStayApart.test.ts`
- Selector: `TC-0018-0049 (TDD-0064): A result with outcome unrun`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/outcomeAndObservationStayApart.test.ts --testNamePattern='TC-0018-0049 \(TDD-0064\): A result with outcome unrun' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { ok: false, state: 'running', …(1) } to deeply equal { ok: true, state: 'blocked', …(1) }` at `tests/unit/workflow/outcomeAndObservationStayApart.test.ts:57:6`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/outcomeAndObservationStayApart.test.ts > TC-0018-0049 (TDD-0064): A result with outcome unrun`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0065

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts`
- Selector: `TC-0018-0051 (TDD-0065): Resubmit the accepted SDD result with the same resultId after the run moved on, its expected sequence now stale`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts --testNamePattern='TC-0018-0051 \(TDD-0065\): Resubmit the accepted SDD result with the same resultId after the run moved on, its expected sequence now stale' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { verdict: { ok: false, …(2) }, …(1) } to deeply equal { verdict: { ok: true, …(1) }, …(1) }` at `tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts:102:62`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts > TC-0018-0051 (TDD-0065): Resubmit the accepted SDD result with the same resultId after the run moved on, its expected sequence now stale`
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Design choice: the snapshot carries `recordedResults`, each accepted result's payload digest and stored verdict keyed by `resultId`, and the input carries `payloadDigest`, which the command adapter computes from the submitted bytes. `accept` looks the `resultId` up before any other check, so a resubmission returns its stored verdict with no events whatever the run's current sequence.

### TDD-0066

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts`
- Selector: `TC-0018-0052 (TDD-0066): The recorded resultId with a different payload digest`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts --testNamePattern='TC-0018-0052 \(TDD-0066\): The recorded resultId with a different payload digest' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: 'invalid-input', …(2) } to deeply equal { code: 'invalid-input', …(2) }` at `tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts:111:27`; the refusal carried no `result-id-reused` reason
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts > TC-0018-0052 (TDD-0066): The recorded resultId with a different payload digest`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0067

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts`
- Selector: `TC-0018-0053 (TDD-0067): length-1`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts --testNamePattern='TC-0018-0053 \(TDD-0067\): length-1' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied: the running-stage accept path already checked `resultId` against `[A-Za-z0-9._-]{1,64}`, from the checkpoint that preceded these rows
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts > TC-0018-0053 (TDD-0067): length-1`
- Production files: none

### TDD-0068

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts`
- Selector: `TC-0018-0053 (TDD-0068): length-64`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts --testNamePattern='TC-0018-0053 \(TDD-0068\): length-64' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied: the running-stage accept path already checked `resultId` against `[A-Za-z0-9._-]{1,64}`, from the checkpoint that preceded these rows
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts > TC-0018-0053 (TDD-0068): length-64`
- Production files: none

### TDD-0069

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts`
- Selector: `TC-0018-0053 (TDD-0069): empty`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts --testNamePattern='TC-0018-0053 \(TDD-0069\): empty' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: 'invalid-input', …(2) } to deeply equal { code: 'invalid-input', …(2) }` at `tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts:179:37`; the refusal carried no `schema` reason
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts > TC-0018-0053 (TDD-0069): empty`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0070

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts`
- Selector: `TC-0018-0053 (TDD-0070): length-65`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts --testNamePattern='TC-0018-0053 \(TDD-0070\): length-65' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: 'invalid-input', …(2) } to deeply equal { code: 'invalid-input', …(2) }` at `tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts:183:49`; the refusal carried no `schema` reason
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts > TC-0018-0053 (TDD-0070): length-65`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0071

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts`
- Selector: `TC-0018-0053 (TDD-0071): outside-char`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts --testNamePattern='TC-0018-0053 \(TDD-0071\): outside-char' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: 'invalid-input', …(2) } to deeply equal { code: 'invalid-input', …(2) }` at `tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts:187:48`; the refusal carried no `schema` reason
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRecordedIdReturnsItsVerdictFirst.test.ts > TC-0018-0053 (TDD-0071): outside-char`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0072

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/acceptIsCompareAndSet.test.ts`
- Selector: `TC-0018-0054 (TDD-0072): A result whose expectedSequence is behind the run's`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/acceptIsCompareAndSet.test.ts --testNamePattern='TC-0018-0054 \(TDD-0072\): A result whose expectedSequence is behind the run's' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { run: { id: 'run-cas', …(2) }, …(2) } to deeply equal { run: { id: 'run-cas', …(2) }, …(2) }` at `tests/unit/workflow/acceptIsCompareAndSet.test.ts:61:6`; the code was `invalid-input`, not `stale-sequence`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/acceptIsCompareAndSet.test.ts > TC-0018-0054 (TDD-0072): A result whose expectedSequence is behind the run's`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0073

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/acceptIsCompareAndSet.test.ts`
- Selector: `TC-0018-0055 (TDD-0073): A result naming a work order other than the outstanding one`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/acceptIsCompareAndSet.test.ts --testNamePattern='TC-0018-0055 \(TDD-0073\): A result naming a work order other than the outstanding one' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: 'invalid-input', …(2) } to deeply equal { code: 'invalid-input', …(2) }` at `tests/unit/workflow/acceptIsCompareAndSet.test.ts:76:6`; the refusal carried no `work-order` reason
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/acceptIsCompareAndSet.test.ts > TC-0018-0055 (TDD-0073): A result naming a work order other than the outstanding one`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0074

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/writesOutsideTheScopeAreRefused.test.ts`
- Selector: `TC-0018-0057 (TDD-0074): outside-write-areas`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/writesOutsideTheScopeAreRefused.test.ts --testNamePattern='TC-0018-0057 \(TDD-0074\): outside-write-areas' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'ready', …(3) } to deeply equal { state: 'running', …(3) }` at `tests/unit/workflow/writesOutsideTheScopeAreRefused.test.ts:109:29`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/writesOutsideTheScopeAreRefused.test.ts > TC-0018-0057 (TDD-0074): outside-write-areas`
- Production files: `packages/qfai/src/core/workflow/decide.ts`; write areas are matched with the existing `compileGlob` of `packages/qfai/src/core/atdd/scaffoldDialect.ts`

### TDD-0075

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/writesOutsideTheScopeAreRefused.test.ts`
- Selector: `TC-0018-0057 (TDD-0075): diagnose-only`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/writesOutsideTheScopeAreRefused.test.ts --testNamePattern='TC-0018-0057 \(TDD-0075\): diagnose-only' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'ready', …(3) } to deeply equal { state: 'running', …(3) }` at `tests/unit/workflow/writesOutsideTheScopeAreRefused.test.ts:130:29`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/writesOutsideTheScopeAreRefused.test.ts > TC-0018-0057 (TDD-0075): diagnose-only`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0076

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theScopeNeverWidensByItself.test.ts`
- Selector: `TC-0018-0058 (TDD-0076): An SDD result binding the spec it created to the goal's slot`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theScopeNeverWidensByItself.test.ts --testNamePattern='TC-0018-0058 \(TDD-0076\): An SDD result binding the spec it created to the goal's slot' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0005, whose SDD accept records one `binding-recorded` event per reported binding
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/theScopeNeverWidensByItself.test.ts > TC-0018-0058 (TDD-0076): An SDD result binding the spec it created to the goal's slot`
- Production files: none

### TDD-0077

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theScopeNeverWidensByItself.test.ts`
- Selector: `TC-0018-0059 (TDD-0077): An SDD result creating a capability no approved slot is bound to`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theScopeNeverWidensByItself.test.ts --testNamePattern='TC-0018-0059 \(TDD-0077\): An SDD result creating a capability no approved slot is bound to' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'ready', …(3) } to deeply equal { state: 'running', …(3) }` at `tests/unit/workflow/theScopeNeverWidensByItself.test.ts:83:6`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/theScopeNeverWidensByItself.test.ts > TC-0018-0059 (TDD-0077): An SDD result creating a capability no approved slot is bound to`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0078

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theScopeNeverWidensByItself.test.ts`
- Selector: `TC-0018-0060 (TDD-0078): Issue a work order whose inputs include paths outside the plan's write scope`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theScopeNeverWidensByItself.test.ts --testNamePattern='TC-0018-0060 \(TDD-0078\): Issue a work order whose inputs include paths outside the plan's write scope' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected undefined to deeply equal [ 'src/notify/**', 'tests/notify/**' ]` at `tests/unit/workflow/theScopeNeverWidensByItself.test.ts:103:55`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/theScopeNeverWidensByItself.test.ts > TC-0018-0060 (TDD-0078): Issue a work order whose inputs include paths outside the plan's write scope`
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Note: the fixture's plan names an observed path outside its write scope. Work orders carry no `inputs` yet, so the case holds that the issued `scope.writeAreas` is the plan's write scope and nothing the plan reads.

### TDD-0079

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aChangedGateDoesNotComplete.test.ts`
- Selector: `TC-0018-0062 (TDD-0079): tool-version`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aChangedGateDoesNotComplete.test.ts --testNamePattern='TC-0018-0062 \(TDD-0079\): tool-version' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { condition: 'tool-drift', …(2) } ]` at `tests/unit/workflow/aChangedGateDoesNotComplete.test.ts:21`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aChangedGateDoesNotComplete.test.ts > TC-0018-0062 (TDD-0079): tool-version`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0080

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aChangedGateDoesNotComplete.test.ts`
- Selector: `TC-0018-0062 (TDD-0080): cli-entry-digest`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aChangedGateDoesNotComplete.test.ts --testNamePattern='TC-0018-0062 \(TDD-0080\): cli-entry-digest' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { condition: 'tool-drift', …(2) } ]` at `tests/unit/workflow/aChangedGateDoesNotComplete.test.ts:21`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aChangedGateDoesNotComplete.test.ts > TC-0018-0062 (TDD-0080): cli-entry-digest`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0081

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theMissingTestBranch.test.ts`
- Selector: `TC-0018-0063 (TDD-0081): A diagnose result missing-test whose appended row's layer is Integration, driven to the last stage`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theMissingTestBranch.test.ts --testNamePattern='TC-0018-0063 \(TDD-0081\): A diagnose result missing-test whose appended row's layer is Integration, driven to the last stage' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0027, whose bugfix drive selects `acceptance` under `acceptance_obligations_unmet` for an `Integration` row.
- GREEN result: exit 0; `✓ … TC-0018-0063 (TDD-0081)`, 1 passed
- Production files: none; the test reads `packages/qfai/src/core/workflow/decide.ts`

### TDD-0082

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theMissingTestBranch.test.ts`
- Selector: `TC-0018-0064 (TDD-0082): The same with the appended row's layer Unit`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theMissingTestBranch.test.ts --testNamePattern='TC-0018-0064 \(TDD-0082\): The same with the appended row's layer Unit' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect({...}).toEqual({...})` at `tests/unit/workflow/theMissingTestBranch.test.ts:113:6` — `acceptanceNotRun` was `undefined`: the core dropped the acceptance stage and recorded nothing for it.
- GREEN result: exit 0; `✓ … TC-0018-0064 (TDD-0082)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`

- Note: the contract names no event for a stage whose predicate does not hold. `next` records each such stage, when it issues the stage after it, as a `receipt-recorded` event carrying `notRun: { kind: "not_applicable", reason }`, the reason naming the predicate. Marked `SIMPLIFIED` in `decide.ts`.

### TDD-0083

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theAppendedRowCarriesItsReason.test.ts`
- Selector: `TC-0018-0066 (TDD-0083): Issue the sdd_append work order after a missing-test diagnosis`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theAppendedRowCarriesItsReason.test.ts --testNamePattern='TC-0018-0066 \(TDD-0083\): Issue the sdd_append work order after a missing-test diagnosis' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect({...}).toEqual({...})` at `tests/unit/workflow/theAppendedRowCarriesItsReason.test.ts:52:6` — `inputs` was `undefined`.
- GREEN result: exit 0; `✓ … TC-0018-0066 (TDD-0083)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Note: the work order's `inputs` entry takes its digest from a new `fileDigests` fact. An input whose digest the facts lack is left out, marked `SIMPLIFIED` in `decide.ts` until the command adapter supplies every digest.

### TDD-0084

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theRegressionBranch.test.ts`
- Selector: `TC-0018-0067 (TDD-0084): A diagnose result regression for a done row`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theRegressionBranch.test.ts --testNamePattern='TC-0018-0067 \(TDD-0084\): A diagnose result regression for a done row' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect({...}).toEqual({...})` at `tests/unit/workflow/theRegressionBranch.test.ts:94:6` — no `regression_fix` work order was issued and `digestRecorded` was `false`.
- GREEN result: exit 0; `✓ … TC-0018-0067 (TDD-0084)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Note: the predicates `regression_found` and `test_defect_found` now read the diagnosis verdict. A work order bound to a spec carries `ledger: { specId, rowIds, rowSetDigest }` from a new `ledger` fact: the digest covers each row's ID, status and digest; `rowIds` are the diagnosis's matched rows for `regression_fix` and `test_fix`, and the rows not `done` otherwise.

### TDD-0085

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRegressionFixNeedsItsReRunAndReview.test.ts`
- Selector: `TC-0018-0068 (TDD-0085): A regression_fix result with the same test's GREEN re-run receipt and an independent review receipt`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRegressionFixNeedsItsReRunAndReview.test.ts --testNamePattern='TC-0018-0068 \(TDD-0085\): A regression_fix result with the same test's GREEN re-run receipt and an independent review receipt' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0084: the accept path takes a complete regression_fix result and returns the run to `ready` with no ledger event.
- GREEN result: exit 0; `✓ … TC-0018-0068 (TDD-0085)`, 1 passed
- Production files: none; the test reads `packages/qfai/src/core/workflow/decide.ts`

### TDD-0086

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRegressionFixNeedsItsReRunAndReview.test.ts`
- Selector: `TC-0018-0069 (TDD-0086): no-rerun-receipt`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRegressionFixNeedsItsReRunAndReview.test.ts --testNamePattern='TC-0018-0069 \(TDD-0086\): no-rerun-receipt' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(refusalOf(...)).toEqual(refused)` at `tests/unit/workflow/aRegressionFixNeedsItsReRunAndReview.test.ts:106:56` — `code` was `undefined` and an `accept-nonfinal-result` event was returned.
- GREEN result: exit 0; `✓ … TC-0018-0069 (TDD-0086)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0087

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRegressionFixNeedsItsReRunAndReview.test.ts`
- Selector: `TC-0018-0069 (TDD-0087): no-review-receipt`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRegressionFixNeedsItsReRunAndReview.test.ts --testNamePattern='TC-0018-0069 \(TDD-0087\): no-review-receipt' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(refusalOf(...)).toEqual(refused)` at `tests/unit/workflow/aRegressionFixNeedsItsReRunAndReview.test.ts:112:57` — `code` was `undefined` and an `accept-nonfinal-result` event was returned.
- GREEN result: exit 0; `✓ … TC-0018-0069 (TDD-0087)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0088

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aWorkOrderNamesRowsNotTheirStatus.test.ts`
- Selector: `TC-0018-0073 (TDD-0088): Issue an implement work order bound to a spec`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aWorkOrderNamesRowsNotTheirStatus.test.ts --testNamePattern='TC-0018-0073 \(TDD-0088\): Issue an implement work order bound to a spec' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0084, which added the work order's `ledger` of row IDs and the row-set digest.
- GREEN result: exit 0; `✓ … TC-0018-0073 (TDD-0088)`, 1 passed
- Production files: none; the test reads `packages/qfai/src/core/workflow/decide.ts`

### TDD-0089

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aDifferentExpectationReclassifies.test.ts`
- Selector: `TC-0018-0074 (TDD-0089): A diagnose result expectation-differs`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aDifferentExpectationReclassifies.test.ts --testNamePattern='TC-0018-0074 \(TDD-0089\): A diagnose result expectation-differs' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect({...}).toEqual({...})` at `tests/unit/workflow/aDifferentExpectationReclassifies.test.ts:77:6` — the run went to `ready` by `accept-nonfinal-result` and the next call issued the implement work order.
- GREEN result: exit 0; `✓ … TC-0018-0074 (TDD-0089)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0090

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aLighterRouteKeepsEveryObligation.test.ts`
- Selector: `TC-0018-0076 (TDD-0090): A RED receipt accepted for an unfinished row, then a reclassification from bugfix to bounded-change, then next`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aLighterRouteKeepsEveryObligation.test.ts --testNamePattern='TC-0018-0076 \(TDD-0090\): A RED receipt accepted for an unfinished row, then a reclassification from bugfix to bounded-change, then next' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect({...}).toEqual({...})` at `tests/unit/workflow/aLighterRouteKeepsEveryObligation.test.ts:51:6` — `priorStageReceiptRefs` was `undefined`.
- GREEN result: exit 0; `✓ … TC-0018-0076 (TDD-0090)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Note: the snapshot gains `receiptRefs`, every result the run has accepted, which survives a replan. Each work order lists them as `priorStageReceiptRefs`, the validity read from the `receiptValidity` fact and `unknown` where the fact is absent.

### TDD-0091

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theTestFixBranch.test.ts`
- Selector: `TC-0018-0077 (TDD-0091): e2e`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theTestFixBranch.test.ts --testNamePattern='TC-0018-0077 \(TDD-0091\): e2e' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; the plan's own `test_fix` stage names `qfai-atdd`, which is the expected executor for this layer.
- GREEN result: exit 0; `✓ … TC-0018-0077 (TDD-0091)`, 1 passed; stays green once the core derives the executor from the row's layer
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0092

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theTestFixBranch.test.ts`
- Selector: `TC-0018-0077 (TDD-0092): api`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theTestFixBranch.test.ts --testNamePattern='TC-0018-0077 \(TDD-0092\): api' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; the plan's own `test_fix` stage names `qfai-atdd`, which is the expected executor for this layer.
- GREEN result: exit 0; `✓ … TC-0018-0077 (TDD-0092)`, 1 passed; stays green once the core derives the executor from the row's layer
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0093

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theTestFixBranch.test.ts`
- Selector: `TC-0018-0077 (TDD-0093): integration-l3`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theTestFixBranch.test.ts --testNamePattern='TC-0018-0077 \(TDD-0093\): integration-l3' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; the plan's own `test_fix` stage names `qfai-atdd`, which is the expected executor for this layer.
- GREEN result: exit 0; `✓ … TC-0018-0077 (TDD-0093)`, 1 passed; stays green once the core derives the executor from the row's layer
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0094

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theTestFixBranch.test.ts`
- Selector: `TC-0018-0077 (TDD-0094): integration-l1-l2`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theTestFixBranch.test.ts --testNamePattern='TC-0018-0077 \(TDD-0094\): integration-l1-l2' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(testFixSkillFor(...)).toEqual([...])` at `tests/unit/workflow/theTestFixBranch.test.ts:60:46` — the executor was the plan's `qfai-atdd`, not `qfai-implement`.
- GREEN result: exit 0; `✓ … TC-0018-0077 (TDD-0094)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`

- Note: the `ledger` fact's rows gain `layer` and `tcLevels`. The core derives a `test_fix` executor from the first matched row; a row the fact does not describe keeps the plan's skill, marked `SIMPLIFIED` in `decide.ts`.

### TDD-0095

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theTestFixBranch.test.ts`
- Selector: `TC-0018-0077 (TDD-0095): unit`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theTestFixBranch.test.ts --testNamePattern='TC-0018-0077 \(TDD-0095\): unit' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(testFixSkillFor(...)).toEqual([...])` at `tests/unit/workflow/theTestFixBranch.test.ts:60:46` — the executor was the plan's `qfai-atdd`, not `qfai-implement`.
- GREEN result: exit 0; `✓ … TC-0018-0077 (TDD-0095)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0096

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theTestFixBranch.test.ts`
- Selector: `TC-0018-0077 (TDD-0096): component`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theTestFixBranch.test.ts --testNamePattern='TC-0018-0077 \(TDD-0096\): component' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(testFixSkillFor(...)).toEqual([...])` at `tests/unit/workflow/theTestFixBranch.test.ts:60:46` — the executor was the plan's `qfai-atdd`, not `qfai-implement`.
- GREEN result: exit 0; `✓ … TC-0018-0077 (TDD-0096)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0097

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aTestFixDeclaresItsEvidence.test.ts`
- Selector: `TC-0018-0078 (TDD-0097): A test_fix result with citedBefore equal to citedAfter, a review receipt and a re-run receipt`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aTestFixDeclaresItsEvidence.test.ts --testNamePattern='TC-0018-0078 \(TDD-0097\): A test_fix result with citedBefore equal to citedAfter, a review receipt and a re-run receipt' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect({...}).toEqual({...})` at `tests/unit/workflow/aTestFixDeclaresItsEvidence.test.ts:109:6` — `ok` was `false`: accept compared the `qfai-implement` executor against the plan's `qfai-atdd` and refused the result.
- GREEN result: exit 0; `✓ … TC-0018-0078 (TDD-0097)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0098

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/reviewIsIndependentAcrossTheRun.test.ts`
- Selector: `TC-0018-0079 (TDD-0098): Issue work orders across a run with an author, a recommender and a reviewer recorded`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/reviewIsIndependentAcrossTheRun.test.ts --testNamePattern='TC-0018-0079 \(TDD-0098\): Issue work orders across a run with an author, a recommender and a reviewer recorded' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect([...]).toEqual([actorHistory, actorHistory])` at `tests/unit/workflow/reviewIsIndependentAcrossTheRun.test.ts:90:6` — both work orders' `actorHistory` were `undefined`.
- GREEN result: exit 0; `✓ … TC-0018-0079 (TDD-0098)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Note: the snapshot gains `actorHistory`, entries of `{ role, agentInstance, stageInstanceId }`, and every issued work order copies it. A review result whose reviewer instance the history shows as an author or recommender anywhere in the run is refused, marked `SIMPLIFIED` in `decide.ts` until a review result names the stage it reviewed.

### TDD-0099

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/reviewIsIndependentAcrossTheRun.test.ts`
- Selector: `TC-0018-0080 (TDD-0099): A review result whose reviewer instance the actor history shows as the author`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/reviewIsIndependentAcrossTheRun.test.ts --testNamePattern='TC-0018-0080 \(TDD-0099\): A review result whose reviewer instance the actor history shows as the author' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect({...}).toEqual({...})` at `tests/unit/workflow/reviewIsIndependentAcrossTheRun.test.ts:144:6` — the result was accepted and the run moved to `ready`.
- GREEN result: exit 0; `✓ … TC-0018-0080 (TDD-0099)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0100

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aChangedExpectationGoesToSdd.test.ts`
- Selector: `TC-0018-0081 (TDD-0100): A test_fix result whose citedAfter differs from citedBefore`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aChangedExpectationGoesToSdd.test.ts --testNamePattern='TC-0018-0081 \(TDD-0100\): A test_fix result whose citedAfter differs from citedBefore' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { ok: true, run: { …(3) }, …(3) } to deeply equal { ok: false, run: { …(3) }, …(3) }` at `tests/unit/workflow/aChangedExpectationGoesToSdd.test.ts:84`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aChangedExpectationGoesToSdd.test.ts > TC-0018-0081 (TDD-0100): A test_fix result whose citedAfter differs from citedBefore`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0101

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theFindingSOwnerRepairsIt.test.ts`
- Selector: `TC-0018-0082 (TDD-0101): A verify result needs_repair whose finding sits in a spec file with resolvingOwner qfai-sdd`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theFindingSOwnerRepairsIt.test.ts --testNamePattern='TC-0018-0082 \(TDD-0101\): A verify result needs_repair whose finding sits in a spec file with resolvingOwner qfai-sdd' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect({...}).toEqual({...})` at `tests/unit/workflow/theFindingSOwnerRepairsIt.test.ts:87:6` — the `needs_repair` verify result was refused, the run stayed `running` and no repair work order was issued.
- GREEN result: exit 0; `✓ … TC-0018-0082 (TDD-0101)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Note: a `needs_repair` result with debts is now accepted, and its `accept-nonfinal-result` event carries them as `repairs`. The snapshot's `repairRequest` sends `next` to the plan stage the first finding's owner serves. Marked `SIMPLIFIED` in `decide.ts`: a repair owned by no plan stage is refused rather than returning the run to routing, and reissuing the detecting stage after the repair waits on a later row.

### TDD-0102

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aTestFixDeclaresItsEvidence.test.ts`
- Selector: `TC-0018-0083 (TDD-0102): no-review-ref`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aTestFixDeclaresItsEvidence.test.ts --testNamePattern='TC-0018-0083 \(TDD-0102\): no-review-ref' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(refusalOf(...)).toEqual(refused)` at `tests/unit/workflow/aTestFixDeclaresItsEvidence.test.ts:119:51` — `reasons` was empty.
- GREEN result: exit 0; `✓ … TC-0018-0083 (TDD-0102)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0103

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aTestFixDeclaresItsEvidence.test.ts`
- Selector: `TC-0018-0083 (TDD-0103): no-rerun-ref`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aTestFixDeclaresItsEvidence.test.ts --testNamePattern='TC-0018-0083 \(TDD-0103\): no-rerun-ref' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(refusalOf(...)).toEqual(refused)` at `tests/unit/workflow/aTestFixDeclaresItsEvidence.test.ts:125:50` — `reasons` was empty.
- GREEN result: exit 0; `✓ … TC-0018-0083 (TDD-0103)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0104

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aMaterialRiskStopsRouting.test.ts`
- Selector: `TC-0018-0084 (TDD-0104): data-loss`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aMaterialRiskStopsRouting.test.ts --testNamePattern='TC-0018-0084 \(TDD-0104\): data-loss' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual({...})` at `tests/unit/workflow/aMaterialRiskStopsRouting.test.ts:104:20` — the proposal went to `ready` by `plan-accepted` and no question was open.
- GREEN result: exit 0; `✓ … TC-0018-0084 (TDD-0104)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`, `packages/qfai/src/core/workflow/parse.ts`

- Note: `parse.ts` gains `parseDecisionQuestion`, which reads a question input from the routing result; a malformed one is refused `invalid-input` with reason `schema`. A routing result's decision questions are stored with core-minted IDs beside any `create` question, and move the run to `awaiting_input`. Fact questions are not read yet, marked `SIMPLIFIED` in `parse.ts`.

### TDD-0105

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aMaterialRiskStopsRouting.test.ts`
- Selector: `TC-0018-0084 (TDD-0105): breaking-public-contract`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aMaterialRiskStopsRouting.test.ts --testNamePattern='TC-0018-0084 \(TDD-0105\): breaking-public-contract' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual({...})` at `tests/unit/workflow/aMaterialRiskStopsRouting.test.ts:104:20` — the proposal went to `ready` by `plan-accepted` and no question was open.
- GREEN result: exit 0; `✓ … TC-0018-0084 (TDD-0105)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`, `packages/qfai/src/core/workflow/parse.ts`

### TDD-0106

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aMaterialRiskStopsRouting.test.ts`
- Selector: `TC-0018-0084 (TDD-0106): authorization-loosened`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aMaterialRiskStopsRouting.test.ts --testNamePattern='TC-0018-0084 \(TDD-0106\): authorization-loosened' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual({...})` at `tests/unit/workflow/aMaterialRiskStopsRouting.test.ts:104:20` — the proposal went to `ready` by `plan-accepted` and no question was open.
- GREEN result: exit 0; `✓ … TC-0018-0084 (TDD-0106)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`, `packages/qfai/src/core/workflow/parse.ts`

### TDD-0107

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aMaterialRiskStopsRouting.test.ts`
- Selector: `TC-0018-0084 (TDD-0107): secret-egress`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aMaterialRiskStopsRouting.test.ts --testNamePattern='TC-0018-0084 \(TDD-0107\): secret-egress' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual({...})` at `tests/unit/workflow/aMaterialRiskStopsRouting.test.ts:104:20` — the proposal went to `ready` by `plan-accepted` and no question was open.
- GREEN result: exit 0; `✓ … TC-0018-0084 (TDD-0107)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`, `packages/qfai/src/core/workflow/parse.ts`

### TDD-0108

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aMaterialRiskStopsRouting.test.ts`
- Selector: `TC-0018-0084 (TDD-0108): production-effect`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aMaterialRiskStopsRouting.test.ts --testNamePattern='TC-0018-0084 \(TDD-0108\): production-effect' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual({...})` at `tests/unit/workflow/aMaterialRiskStopsRouting.test.ts:104:20` — the proposal went to `ready` by `plan-accepted` and no question was open.
- GREEN result: exit 0; `✓ … TC-0018-0084 (TDD-0108)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`, `packages/qfai/src/core/workflow/parse.ts`

### TDD-0109

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aMaterialRiskStopsRouting.test.ts`
- Selector: `TC-0018-0084 (TDD-0109): requirement-dropped`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aMaterialRiskStopsRouting.test.ts --testNamePattern='TC-0018-0084 \(TDD-0109\): requirement-dropped' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual({...})` at `tests/unit/workflow/aMaterialRiskStopsRouting.test.ts:104:20` — the proposal went to `ready` by `plan-accepted` and no question was open.
- GREEN result: exit 0; `✓ … TC-0018-0084 (TDD-0109)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`, `packages/qfai/src/core/workflow/parse.ts`

### TDD-0110

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aMaterialRiskStopsRouting.test.ts`
- Selector: `TC-0018-0084 (TDD-0110): out-of-scope-work`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aMaterialRiskStopsRouting.test.ts --testNamePattern='TC-0018-0084 \(TDD-0110\): out-of-scope-work' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual({...})` at `tests/unit/workflow/aMaterialRiskStopsRouting.test.ts:104:20` — the proposal went to `ready` by `plan-accepted` and no question was open.
- GREEN result: exit 0; `✓ … TC-0018-0084 (TDD-0110)`, 1 passed
- Production files: `packages/qfai/src/core/workflow/decide.ts`, `packages/qfai/src/core/workflow/parse.ts`

### TDD-0111

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/restoringACheckIsNotAQuestion.test.ts`
- Selector: `TC-0018-0085 (TDD-0111): A bugfix routing result whose only risk signal is authorization-restored`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/restoringACheckIsNotAQuestion.test.ts --testNamePattern='TC-0018-0085 \(TDD-0111\): A bugfix routing result whose only risk signal is authorization-restored' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [ …(4) ] to deeply equal [ Array(4) ]` at `tests/unit/workflow/restoringACheckIsNotAQuestion.test.ts:119`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/restoringACheckIsNotAQuestion.test.ts > TC-0018-0085 (TDD-0111): A bugfix routing result whose only risk signal is authorization-restored`
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Note: an accepted plan keeps the routing result's `riskSignals`. A work order's `requiredReviewerRoles` come from a new `reviewerRoles` fact, the always-required reviewers of each skill's profile; in a run carrying `authorization-restored`, a `qfai-implement` or `qfai-atdd` work order takes `completion-reviewer`, `qa-gatekeeper` and `implementation-reviewer` instead. A skill the fact does not carry gets no roles, marked `SIMPLIFIED` in `decide.ts` until the command adapter supplies every plan skill's roles.

### TDD-0112

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts`
- Selector: `TC-0018-0086 (TDD-0112): push`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts --testNamePattern='TC-0018-0086 \(TDD-0112\): push' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected undefined to deeply equal []` at `tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts:57`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts > TC-0018-0086 (TDD-0112): push`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0113

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts`
- Selector: `TC-0018-0086 (TDD-0113): pull-request`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts --testNamePattern='TC-0018-0086 \(TDD-0113\): pull-request' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected undefined to deeply equal []` at `tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts:57`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts > TC-0018-0086 (TDD-0113): pull-request`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0114

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts`
- Selector: `TC-0018-0086 (TDD-0114): merge`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts --testNamePattern='TC-0018-0086 \(TDD-0114\): merge' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected undefined to deeply equal []` at `tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts:57`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts > TC-0018-0086 (TDD-0114): merge`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0115

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts`
- Selector: `TC-0018-0086 (TDD-0115): deploy`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts --testNamePattern='TC-0018-0086 \(TDD-0115\): deploy' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected undefined to deeply equal []` at `tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts:57`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts > TC-0018-0086 (TDD-0115): deploy`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0116

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts`
- Selector: `TC-0018-0086 (TDD-0116): production-migration`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts --testNamePattern='TC-0018-0086 \(TDD-0116\): production-migration' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected undefined to deeply equal []` at `tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts:57`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts > TC-0018-0086 (TDD-0116): production-migration`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0117

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts`
- Selector: `TC-0018-0086 (TDD-0117): extra-spending`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts --testNamePattern='TC-0018-0086 \(TDD-0117\): extra-spending' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected undefined to deeply equal []` at `tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts:57`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts > TC-0018-0086 (TDD-0117): extra-spending`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0118

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts`
- Selector: `TC-0018-0087 (TDD-0118): project-policy-deploy`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts --testNamePattern='TC-0018-0087 \(TDD-0118\): project-policy-deploy' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected undefined to deeply equal [ 'deploy' ]` at `tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts:67`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts > TC-0018-0087 (TDD-0118): project-policy-deploy`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0119

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts`
- Selector: `TC-0018-0087 (TDD-0119): request-scope-push`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts --testNamePattern='TC-0018-0087 \(TDD-0119\): request-scope-push' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected undefined to deeply equal []` at `tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts:72`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/externalEffectsNeedTheirOwnAuthorization.test.ts > TC-0018-0087 (TDD-0119): request-scope-push`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0120

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/eachOptionCarriesItsEffect.test.ts`
- Selector: `TC-0018-0088 (TDD-0120): proceed`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/eachOptionCarriesItsEffect.test.ts --testNamePattern='TC-0018-0088 \(TDD-0120\): proceed' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'awaiting_input', …(4) } to deeply equal { state: 'ready', …(4) }` at `tests/unit/workflow/eachOptionCarriesItsEffect.test.ts:81`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/eachOptionCarriesItsEffect.test.ts > TC-0018-0088 (TDD-0120): proceed`
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Note: `decision` now answers a `decision` question as well as a `create` one. The chosen options are checked against the offered set and `selection` first, and a failure is refused `invalid-input` with reason `option`. The answer takes the strongest chosen effect; `replan` adds `answer-changes-scope` and moves the run to `routing`, and `stop` adds `authorized-stop` and moves it to `cancelled`. A `human_decision` for a non-`create` question records `operation: null` and no target.

### TDD-0121

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/eachOptionCarriesItsEffect.test.ts`
- Selector: `TC-0018-0088 (TDD-0121): replan`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/eachOptionCarriesItsEffect.test.ts --testNamePattern='TC-0018-0088 \(TDD-0121\): replan' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'awaiting_input', …(4) } to deeply equal { state: 'routing', …(4) }` at `tests/unit/workflow/eachOptionCarriesItsEffect.test.ts:81`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/eachOptionCarriesItsEffect.test.ts > TC-0018-0088 (TDD-0121): replan`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0122

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/eachOptionCarriesItsEffect.test.ts`
- Selector: `TC-0018-0088 (TDD-0122): stop`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/eachOptionCarriesItsEffect.test.ts --testNamePattern='TC-0018-0088 \(TDD-0122\): stop' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'awaiting_input', …(4) } to deeply equal { state: 'cancelled', …(4) }` at `tests/unit/workflow/eachOptionCarriesItsEffect.test.ts:81`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/eachOptionCarriesItsEffect.test.ts > TC-0018-0088 (TDD-0122): stop`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0123

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/eachOptionCarriesItsEffect.test.ts`
- Selector: `TC-0018-0089 (TDD-0123): A multi-select answer choosing a proceed option and a stop option`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/eachOptionCarriesItsEffect.test.ts --testNamePattern='TC-0018-0089 \(TDD-0123\): A multi-select answer choosing a proceed option and a stop option' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'awaiting_input', …(4) } to deeply equal { state: 'cancelled', …(4) }` at `tests/unit/workflow/eachOptionCarriesItsEffect.test.ts:92`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/eachOptionCarriesItsEffect.test.ts > TC-0018-0089 (TDD-0123): A multi-select answer choosing a proceed option and a stop option`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0124

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/eachOptionCarriesItsEffect.test.ts`
- Selector: `TC-0018-0090 (TDD-0124): count-min`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/eachOptionCarriesItsEffect.test.ts --testNamePattern='TC-0018-0090 \(TDD-0124\): count-min' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { recorded: undefined, …(1) } to deeply equal { …(2) }` at `tests/unit/workflow/eachOptionCarriesItsEffect.test.ts:123`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/eachOptionCarriesItsEffect.test.ts > TC-0018-0090 (TDD-0124): count-min`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0125

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/eachOptionCarriesItsEffect.test.ts`
- Selector: `TC-0018-0090 (TDD-0125): count-max`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/eachOptionCarriesItsEffect.test.ts --testNamePattern='TC-0018-0090 \(TDD-0125\): count-max' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { recorded: undefined, …(1) } to deeply equal { …(2) }` at `tests/unit/workflow/eachOptionCarriesItsEffect.test.ts:123`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/eachOptionCarriesItsEffect.test.ts > TC-0018-0090 (TDD-0125): count-max`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0126

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/eachOptionCarriesItsEffect.test.ts`
- Selector: `TC-0018-0090 (TDD-0126): below-min`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/eachOptionCarriesItsEffect.test.ts --testNamePattern='TC-0018-0090 \(TDD-0126\): below-min' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'awaiting_input', …(4) } to deeply equal { state: 'awaiting_input', …(4) }` at `tests/unit/workflow/eachOptionCarriesItsEffect.test.ts:121`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/eachOptionCarriesItsEffect.test.ts > TC-0018-0090 (TDD-0126): below-min`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0127

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/eachOptionCarriesItsEffect.test.ts`
- Selector: `TC-0018-0090 (TDD-0127): above-max`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/eachOptionCarriesItsEffect.test.ts --testNamePattern='TC-0018-0090 \(TDD-0127\): above-max' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'awaiting_input', …(4) } to deeply equal { state: 'awaiting_input', …(4) }` at `tests/unit/workflow/eachOptionCarriesItsEffect.test.ts:121`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/eachOptionCarriesItsEffect.test.ts > TC-0018-0090 (TDD-0127): above-max`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0128

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/eachOptionCarriesItsEffect.test.ts`
- Selector: `TC-0018-0090 (TDD-0128): option-outside`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/eachOptionCarriesItsEffect.test.ts --testNamePattern='TC-0018-0090 \(TDD-0128\): option-outside' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'awaiting_input', …(4) } to deeply equal { state: 'awaiting_input', …(4) }` at `tests/unit/workflow/eachOptionCarriesItsEffect.test.ts:121`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/eachOptionCarriesItsEffect.test.ts > TC-0018-0090 (TDD-0128): option-outside`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0129

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aProceedAnswerContinuesUnprompted.test.ts`
- Selector: `TC-0018-0091 (TDD-0129): A proceed answer to a material question, then next`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aProceedAnswerContinuesUnprompted.test.ts --testNamePattern='TC-0018-0091 \(TDD-0129\): A proceed answer to a material question, then next' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0120: a `proceed` answer moves the run to `ready`, and `next` from `ready` issues the plan's first unaccepted stage.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aProceedAnswerContinuesUnprompted.test.ts > TC-0018-0091 (TDD-0129): A proceed answer to a material question, then next`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0130

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aNoQuestionModeApprovesNothing.test.ts`
- Selector: `TC-0018-0092 (TDD-0130): A run in awaiting_input that nobody answers`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aNoQuestionModeApprovesNothing.test.ts --testNamePattern='TC-0018-0092 \(TDD-0130\): A run in awaiting_input that nobody answers' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { ok: false, run: { …(3) }, …(1) } to deeply equal { ok: true, run: { …(3) }, …(2) }` at `tests/unit/workflow/aNoQuestionModeApprovesNothing.test.ts:31`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aNoQuestionModeApprovesNothing.test.ts > TC-0018-0092 (TDD-0130): A run in awaiting_input that nobody answers`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0131

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/oneMissingValueOneQuestion.test.ts`
- Selector: `TC-0018-0093 (TDD-0131): A routing result blocked only by the expected HTTP status, opened as one question`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneMissingValueOneQuestion.test.ts --testNamePattern='TC-0018-0093 \(TDD-0131\): A routing result blocked only by the expected HTTP status, opened as one question' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'routing', …(4) } to deeply equal { state: 'awaiting_input', …(4) }` at `tests/unit/workflow/oneMissingValueOneQuestion.test.ts:104`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/oneMissingValueOneQuestion.test.ts > TC-0018-0093 (TDD-0131): A routing result blocked only by the expected HTTP status, opened as one question`
- Production files: `packages/qfai/src/core/workflow/decide.ts`, `packages/qfai/src/core/workflow/parse.ts`

### TDD-0132

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts`
- Selector: `TC-0018-0095 (TDD-0132): A stage result carrying approved`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts --testNamePattern='TC-0018-0095 \(TDD-0132\): A stage result carrying approved' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { ok: true, code: undefined, …(2) } to deeply equal { ok: false, …(3) }` at `tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts:108`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts > TC-0018-0095 (TDD-0132): A stage result carrying approved`
- Production files: `packages/qfai/src/core/workflow/decide.ts`, `packages/qfai/src/core/workflow/parse.ts`

### TDD-0133

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts`
- Selector: `TC-0018-0096 (TDD-0133): A decision naming no open question, not a stop`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts --testNamePattern='TC-0018-0096 \(TDD-0133\): A decision naming no open question, not a stop' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { ok: false, …(4) } to deeply equal { ok: false, …(4) }` at `tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts:118` (the code was `invalid-input`)
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts > TC-0018-0096 (TDD-0133): A decision naming no open question, not a stop`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0134

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts`
- Selector: `TC-0018-0097 (TDD-0134): A decision whose payload declares capture`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts --testNamePattern='TC-0018-0097 \(TDD-0134\): A decision whose payload declares capture' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0003, which records every `human_decision` as `agent_captured`; the submitted `capture` is not read
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts > TC-0018-0097 (TDD-0134): A decision whose payload declares capture`
- Production files: none; a seam field on the decision input type in `packages/qfai/src/core/workflow/decide.ts`

### TDD-0135

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts`
- Selector: `TC-0018-0098 (TDD-0135): mode-at-accept`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts --testNamePattern='TC-0018-0098 \(TDD-0135\): mode-at-accept' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { ok: true, code: undefined, …(2) } to deeply equal { ok: false, …(3) }` at `tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts:146`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts > TC-0018-0098 (TDD-0135): mode-at-accept`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0136

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts`
- Selector: `TC-0018-0098 (TDD-0136): mode-at-decision`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts --testNamePattern='TC-0018-0098 \(TDD-0136\): mode-at-decision' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { ok: true, code: undefined, …(2) } to deeply equal { ok: false, …(3) }` at `tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts:146`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts > TC-0018-0098 (TDD-0136): mode-at-decision`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0137

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts`
- Selector: `TC-0018-0098 (TDD-0137): confidence-at-accept`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts --testNamePattern='TC-0018-0098 \(TDD-0137\): confidence-at-accept' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { ok: true, code: undefined, …(2) } to deeply equal { ok: false, …(3) }` at `tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts:146`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts > TC-0018-0098 (TDD-0137): confidence-at-accept`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0138

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts`
- Selector: `TC-0018-0098 (TDD-0138): confidence-at-decision`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts --testNamePattern='TC-0018-0098 \(TDD-0138\): confidence-at-decision' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { ok: true, code: undefined, …(2) } to deeply equal { ok: false, …(3) }` at `tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts:146`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/agentWrittenApprovalsAreRefused.test.ts > TC-0018-0098 (TDD-0138): confidence-at-decision`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0139

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aDecisionIsIdentifiedByItsQuestionAndAnswer.test.ts`
- Selector: `TC-0018-0099 (TDD-0139): The same question and the same answer submitted twice`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aDecisionIsIdentifiedByItsQuestionAndAnswer.test.ts --testNamePattern='TC-0018-0099 \(TDD-0139\): The same question and the same answer submitted twice' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { Object (sameVerdict, events, ...) } to deeply equal { sameVerdict: true, events: [], …(1) }` at `tests/unit/workflow/aDecisionIsIdentifiedByItsQuestionAndAnswer.test.ts:86`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aDecisionIsIdentifiedByItsQuestionAndAnswer.test.ts > TC-0018-0099 (TDD-0139): The same question and the same answer submitted twice`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0140

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aDecisionIsIdentifiedByItsQuestionAndAnswer.test.ts`
- Selector: `TC-0018-0100 (TDD-0140): A different answer to the answered question`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aDecisionIsIdentifiedByItsQuestionAndAnswer.test.ts --testNamePattern='TC-0018-0100 \(TDD-0140\): A different answer to the answered question' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { Object (code, events) } to deeply equal { code: 'answer-conflict', events: [] }` at `tests/unit/workflow/aDecisionIsIdentifiedByItsQuestionAndAnswer.test.ts:91`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aDecisionIsIdentifiedByItsQuestionAndAnswer.test.ts > TC-0018-0100 (TDD-0140): A different answer to the answered question`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0141

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aDecisionIsIdentifiedByItsQuestionAndAnswer.test.ts`
- Selector: `TC-0018-0101 (TDD-0141): nfd`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aDecisionIsIdentifiedByItsQuestionAndAnswer.test.ts --testNamePattern='TC-0018-0101 \(TDD-0141\): nfd' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { sameVerdict: false, events: [] } to deeply equal { sameVerdict: true, events: [] }` at `tests/unit/workflow/aDecisionIsIdentifiedByItsQuestionAndAnswer.test.ts:110`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aDecisionIsIdentifiedByItsQuestionAndAnswer.test.ts > TC-0018-0101 (TDD-0141): nfd`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0142

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aDecisionIsIdentifiedByItsQuestionAndAnswer.test.ts`
- Selector: `TC-0018-0101 (TDD-0142): white-space`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aDecisionIsIdentifiedByItsQuestionAndAnswer.test.ts --testNamePattern='TC-0018-0101 \(TDD-0142\): white-space' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { sameVerdict: false, events: [] } to deeply equal { sameVerdict: true, events: [] }` at `tests/unit/workflow/aDecisionIsIdentifiedByItsQuestionAndAnswer.test.ts:110`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aDecisionIsIdentifiedByItsQuestionAndAnswer.test.ts > TC-0018-0101 (TDD-0142): white-space`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0143

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aDecisionIsIdentifiedByItsQuestionAndAnswer.test.ts`
- Selector: `TC-0018-0101 (TDD-0143): option-order`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aDecisionIsIdentifiedByItsQuestionAndAnswer.test.ts --testNamePattern='TC-0018-0101 \(TDD-0143\): option-order' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { sameVerdict: false, events: [] } to deeply equal { sameVerdict: true, events: [] }` at `tests/unit/workflow/aDecisionIsIdentifiedByItsQuestionAndAnswer.test.ts:110`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aDecisionIsIdentifiedByItsQuestionAndAnswer.test.ts > TC-0018-0101 (TDD-0143): option-order`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0144

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theExecutionContext.test.ts`
- Selector: `TC-0018-0105 (TDD-0144): Decide start`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theExecutionContext.test.ts --testNamePattern='TC-0018-0105 \(TDD-0144\): Decide start' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { run: null, context: undefined } to deeply equal { run: { …(3) }, context: { …(7) } }` at `tests/unit/workflow/theExecutionContext.test.ts:42` (line as the file now stands; the start input was reshaped to the contract's `request: { text }` and `harness: { host, capabilities }` after the run)
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/theExecutionContext.test.ts > TC-0018-0105 (TDD-0144): Decide start`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0145

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/resumeFromTheSmallestValidCheckpoint.test.ts`
- Selector: `TC-0018-0109 (TDD-0145): resume facts where one receipt's dependency cannot be read`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/resumeFromTheSmallestValidCheckpoint.test.ts --testNamePattern='TC-0018-0109 \(TDD-0145\): resume facts where one receipt's dependency cannot be read' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { receipts: undefined, …(3) } to deeply equal { receipts: [ { …(2) } ], …(3) }` at `tests/unit/workflow/resumeFromTheSmallestValidCheckpoint.test.ts:39`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/resumeFromTheSmallestValidCheckpoint.test.ts > TC-0018-0109 (TDD-0145): resume facts where one receipt's dependency cannot be read`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0146

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/persistence.test.ts`
- Selector: `TC-0018-0122 (TDD-0146): ebusy`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/persistence.test.ts --testNamePattern='TC-0018-0122 \(TDD-0146\): ebusy' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { refusal: undefined, …(2) } to deeply equal { Object (refusal, exitCode, ...) }` at `tests/unit/workflow/persistence.test.ts:24`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/persistence.test.ts > TC-0018-0122 (TDD-0146): ebusy`
- Production files: `packages/qfai/src/core/workflow/persistence.ts`, `packages/qfai/src/cli/commands/workflow.ts`

### TDD-0147

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/persistence.test.ts`
- Selector: `TC-0018-0122 (TDD-0147): eperm`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/persistence.test.ts --testNamePattern='TC-0018-0122 \(TDD-0147\): eperm' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { refusal: undefined, …(2) } to deeply equal { Object (refusal, exitCode, ...) }` at `tests/unit/workflow/persistence.test.ts:24`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/persistence.test.ts > TC-0018-0122 (TDD-0147): eperm`
- Production files: `packages/qfai/src/core/workflow/persistence.ts`, `packages/qfai/src/cli/commands/workflow.ts`

### TDD-0148

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/persistence.test.ts`
- Selector: `TC-0018-0122 (TDD-0148): eacces`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/persistence.test.ts --testNamePattern='TC-0018-0122 \(TDD-0148\): eacces' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { refusal: undefined, …(2) } to deeply equal { Object (refusal, exitCode, ...) }` at `tests/unit/workflow/persistence.test.ts:24`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/persistence.test.ts > TC-0018-0122 (TDD-0148): eacces`
- Production files: `packages/qfai/src/core/workflow/persistence.ts`, `packages/qfai/src/cli/commands/workflow.ts`

### TDD-0149

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStopCancelsAtOnce.test.ts`
- Selector: `TC-0018-0135 (TDD-0149): created`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStopCancelsAtOnce.test.ts --testNamePattern='TC-0018-0135 \(TDD-0149\): created' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { run: { id: 'run-stop', …(2) }, …(1) } to deeply equal { run: { id: 'run-stop', …(2) }, …(1) }` at `tests/unit/workflow/aStopCancelsAtOnce.test.ts:47`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStopCancelsAtOnce.test.ts > TC-0018-0135 (TDD-0149): created`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0150

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStopCancelsAtOnce.test.ts`
- Selector: `TC-0018-0135 (TDD-0150): routing`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStopCancelsAtOnce.test.ts --testNamePattern='TC-0018-0135 \(TDD-0150\): routing' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { run: { id: 'run-stop', …(2) }, …(1) } to deeply equal { run: { id: 'run-stop', …(2) }, …(1) }` at `tests/unit/workflow/aStopCancelsAtOnce.test.ts:47`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStopCancelsAtOnce.test.ts > TC-0018-0135 (TDD-0150): routing`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0151

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStopCancelsAtOnce.test.ts`
- Selector: `TC-0018-0135 (TDD-0151): ready`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStopCancelsAtOnce.test.ts --testNamePattern='TC-0018-0135 \(TDD-0151\): ready' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { run: { id: 'run-stop', …(2) }, …(1) } to deeply equal { run: { id: 'run-stop', …(2) }, …(1) }` at `tests/unit/workflow/aStopCancelsAtOnce.test.ts:47`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStopCancelsAtOnce.test.ts > TC-0018-0135 (TDD-0151): ready`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0152

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStopCancelsAtOnce.test.ts`
- Selector: `TC-0018-0135 (TDD-0152): running`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStopCancelsAtOnce.test.ts --testNamePattern='TC-0018-0135 \(TDD-0152\): running' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { run: { id: 'run-stop', …(2) }, …(1) } to deeply equal { run: { id: 'run-stop', …(2) }, …(1) }` at `tests/unit/workflow/aStopCancelsAtOnce.test.ts:47`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStopCancelsAtOnce.test.ts > TC-0018-0135 (TDD-0152): running`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0153

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStopCancelsAtOnce.test.ts`
- Selector: `TC-0018-0135 (TDD-0153): awaiting-input`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStopCancelsAtOnce.test.ts --testNamePattern='TC-0018-0135 \(TDD-0153\): awaiting-input' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { run: { id: 'run-stop', …(2) }, …(1) } to deeply equal { run: { id: 'run-stop', …(2) }, …(1) }` at `tests/unit/workflow/aStopCancelsAtOnce.test.ts:47`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStopCancelsAtOnce.test.ts > TC-0018-0135 (TDD-0153): awaiting-input`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0154

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStopCancelsAtOnce.test.ts`
- Selector: `TC-0018-0135 (TDD-0154): blocked`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStopCancelsAtOnce.test.ts --testNamePattern='TC-0018-0135 \(TDD-0154\): blocked' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { run: { id: 'run-stop', …(2) }, …(1) } to deeply equal { run: { id: 'run-stop', …(2) }, …(1) }` at `tests/unit/workflow/aStopCancelsAtOnce.test.ts:47`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStopCancelsAtOnce.test.ts > TC-0018-0135 (TDD-0154): blocked`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0155

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStopCancelsAtOnce.test.ts`
- Selector: `TC-0018-0135 (TDD-0155): interrupted`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStopCancelsAtOnce.test.ts --testNamePattern='TC-0018-0135 \(TDD-0155\): interrupted' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { run: { id: 'run-stop', …(2) }, …(1) } to deeply equal { run: { id: 'run-stop', …(2) }, …(1) }` at `tests/unit/workflow/aStopCancelsAtOnce.test.ts:47`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStopCancelsAtOnce.test.ts > TC-0018-0135 (TDD-0155): interrupted`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0156

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStopCancelsAtOnce.test.ts`
- Selector: `TC-0018-0136 (TDD-0156): A second stop on a run a stop cancelled`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStopCancelsAtOnce.test.ts --testNamePattern='TC-0018-0136 \(TDD-0156\): A second stop on a run a stop cancelled' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { same: false, events: [] } to deeply equal { same: true, events: [] }` at `tests/unit/workflow/aStopCancelsAtOnce.test.ts:63`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStopCancelsAtOnce.test.ts > TC-0018-0136 (TDD-0156): A second stop on a run a stop cancelled`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0157

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStopCancelsAtOnce.test.ts`
- Selector: `TC-0018-0137 (TDD-0157): accept`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStopCancelsAtOnce.test.ts --testNamePattern='TC-0018-0137 \(TDD-0157\): accept' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { ok: false, …(3) } to deeply equal { ok: false, …(3) }` at `tests/unit/workflow/aStopCancelsAtOnce.test.ts:107`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStopCancelsAtOnce.test.ts > TC-0018-0137 (TDD-0157): accept`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0158

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStopCancelsAtOnce.test.ts`
- Selector: `TC-0018-0137 (TDD-0158): next`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStopCancelsAtOnce.test.ts --testNamePattern='TC-0018-0137 \(TDD-0158\): next' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { ok: true, code: undefined, …(2) } to deeply equal { ok: false, …(3) }` at `tests/unit/workflow/aStopCancelsAtOnce.test.ts:107`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStopCancelsAtOnce.test.ts > TC-0018-0137 (TDD-0158): next`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0159

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStopCancelsAtOnce.test.ts`
- Selector: `TC-0018-0137 (TDD-0159): decision`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStopCancelsAtOnce.test.ts --testNamePattern='TC-0018-0137 \(TDD-0159\): decision' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { ok: false, …(3) } to deeply equal { ok: false, …(3) }` at `tests/unit/workflow/aStopCancelsAtOnce.test.ts:107`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStopCancelsAtOnce.test.ts > TC-0018-0137 (TDD-0159): decision`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0160

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStopCancelsAtOnce.test.ts`
- Selector: `TC-0018-0137 (TDD-0160): resume`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStopCancelsAtOnce.test.ts --testNamePattern='TC-0018-0137 \(TDD-0160\): resume' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { ok: true, code: undefined, …(2) } to deeply equal { ok: false, …(3) }` at `tests/unit/workflow/aStopCancelsAtOnce.test.ts:107`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStopCancelsAtOnce.test.ts > TC-0018-0137 (TDD-0160): resume`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0161

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStopCancelsAtOnce.test.ts`
- Selector: `TC-0018-0137 (TDD-0161): finish`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStopCancelsAtOnce.test.ts --testNamePattern='TC-0018-0137 \(TDD-0161\): finish' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { ok: false, …(3) } to deeply equal { ok: false, …(3) }` at `tests/unit/workflow/aStopCancelsAtOnce.test.ts:107`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStopCancelsAtOnce.test.ts > TC-0018-0137 (TDD-0161): finish`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0162

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/anUnrecordedStopIsReconciled.test.ts`
- Selector: `TC-0018-0140 (TDD-0162): Decide resume on a run in running whose outstanding work order has no accepted result`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/anUnrecordedStopIsReconciled.test.ts --testNamePattern='TC-0018-0140 \(TDD-0162\): Decide resume on a run in running whose outstanding work order has no accepted result' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0031, which added the `resume` transition firing `observed-session-interruption` and `reconciled-resume` and returning the outstanding work order
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/anUnrecordedStopIsReconciled.test.ts > TC-0018-0140 (TDD-0162): Decide resume on a run in running whose outstanding work order has no accepted result`
- Production files: none

### TDD-0163

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0141 (TDD-0163): capture-request`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0141 \(TDD-0163\): capture-request' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `resume` on a run in `created` stayed `created` with no events where `routing` and `capture-request` were expected, `transitionsFollowTheEdgeTable.test.ts:163`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0141 (TDD-0163): capture-request`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0164

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0141 (TDD-0164): plan-accepted`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0141 \(TDD-0164\): plan-accepted' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0014 (commit `cfdcd528d`), which added the checked routing accept that moves a run with no open question to `ready` with `plan-accepted`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0141 (TDD-0164): plan-accepted`
- Production files: none

### TDD-0165

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0141 (TDD-0165): unsettled-material-input`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0141 \(TDD-0165\): unsettled-material-input' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0001, which opens a `create` question and moves the run to `awaiting_input` with `unsettled-material-input`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0141 (TDD-0165): unsettled-material-input`
- Production files: none

### TDD-0166

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0141 (TDD-0166): missing-capability`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0141 \(TDD-0166\): missing-capability' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `accept` of a routing result with outcome `blocked` left the run in `routing` with no events where `blocked` and `missing-capability` were expected, `tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts:191`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0141 (TDD-0166): missing-capability`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0167

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0141 (TDD-0167): dispatch-work-order`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0141 \(TDD-0167\): dispatch-work-order' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `resume` on a run in `ready` left it `ready` with no events where `running`, `work-order-issued` and `dispatch-work-order` were expected, `tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts:203`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0141 (TDD-0167): dispatch-work-order`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0168

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0141 (TDD-0168): required-plan-revision`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0141 \(TDD-0168\): required-plan-revision' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `next` and `resume` on a run in `ready` whose routing receipt is `stale` did not return the run to `routing` with `required-plan-revision`, `tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts:217`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0141 (TDD-0168): required-plan-revision`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0169

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0141 (TDD-0169): validated-final-result-and-target`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0141 \(TDD-0169\): validated-final-result-and-target' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0050, which completes a run in `ready` with `validated-final-result-and-target` when every condition holds
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0141 (TDD-0169): validated-final-result-and-target`
- Production files: none

### TDD-0170

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0141 (TDD-0170): accept-nonfinal-result`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0141 \(TDD-0170\): accept-nonfinal-result' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0002, whose feature-plan drive moves a run in `running` to `ready` with `accept-nonfinal-result` on an accepted result
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0141 (TDD-0170): accept-nonfinal-result`
- Production files: none

### TDD-0171

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0141 (TDD-0171): material-decision`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0141 \(TDD-0171\): material-decision' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `accept` of a stage result with outcome `awaiting_input` left the run in `running` with no events where `awaiting_input`, `question-opened` and `material-decision` were expected, `tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts:262`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0141 (TDD-0171): material-decision`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0172

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0141 (TDD-0172): unrun-or-unresolved-dependency`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0141 \(TDD-0172\): unrun-or-unresolved-dependency' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `accept` of a stage result with outcome `blocked` was refused where `blocked` and `unrun-or-unresolved-dependency` were expected, `tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts:268`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0141 (TDD-0172): unrun-or-unresolved-dependency`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0173

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0141 (TDD-0173): observed-session-interruption`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0141 \(TDD-0173\): observed-session-interruption' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0162, which fires `observed-session-interruption` on `resume` of a run in `running`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0141 (TDD-0173): observed-session-interruption`
- Production files: none

### TDD-0174

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0141 (TDD-0174): scope-or-obligation-revision`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0141 \(TDD-0174\): scope-or-obligation-revision' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0089, which returns the run to `routing` with `scope-or-obligation-revision` on a diagnose verdict `expectation-differs`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0141 (TDD-0174): scope-or-obligation-revision`
- Production files: none

### TDD-0175

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0141 (TDD-0175): valid-answer-no-replan`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0141 \(TDD-0175\): valid-answer-no-replan' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; a `proceed` answer recorded only `authorization-recorded` where `valid-answer-no-replan` was also expected, `tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts:323`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0141 (TDD-0175): valid-answer-no-replan`
- Production files: `packages/qfai/src/core/workflow/decide.ts`, `packages/qfai/tests/unit/workflow/eachOptionCarriesItsEffect.test.ts` (TDD-0120's expected event list gains the edge event)

### TDD-0176

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0141 (TDD-0176): answer-changes-scope`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0141 \(TDD-0176\): answer-changes-scope' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0121, which returns the run to `routing` with `answer-changes-scope` on a `replan` answer
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0141 (TDD-0176): answer-changes-scope`
- Production files: none

### TDD-0177

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0141 (TDD-0177): blocker-cleared-and-revalidated`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0141 \(TDD-0177\): blocker-cleared-and-revalidated' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `resume` on a run in `blocked` left it `blocked` with no events where `blocker-cleared-and-revalidated` and a second attempt of the blocked stage were expected, `tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts:344`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0141 (TDD-0177): blocker-cleared-and-revalidated`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0178

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0141 (TDD-0178): reconciled-resume`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0141 \(TDD-0178\): reconciled-resume' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0162, which fires `reconciled-resume` in the same `resume` call as `observed-session-interruption`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0141 (TDD-0178): reconciled-resume`
- Production files: none

### TDD-0179

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0141 (TDD-0179): reconciled-with-blocker`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0141 \(TDD-0179\): reconciled-with-blocker' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `resume` of a run in `running` with a cause in the facts reconciled to `running` where `blocked` and `reconciled-with-blocker` were expected, `tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts:363`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0141 (TDD-0179): reconciled-with-blocker`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0180

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0142 (TDD-0180): next`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0142 \(TDD-0180\): next' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0001: an operation with no edge from the state reaches the closing check of `decide`, which refuses it `invalid-input` with no events
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0142 (TDD-0180): next`
- Production files: none

### TDD-0181

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0142 (TDD-0181): accept`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0142 \(TDD-0181\): accept' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0073: with no outstanding work order the result is refused `invalid-input` with reason `work-order`, and no events
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0142 (TDD-0181): accept`
- Production files: none

### TDD-0182

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0142 (TDD-0182): decision-answer`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0142 \(TDD-0182\): decision-answer' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0133: a non-stop `decision` naming no open question is refused `no-open-question`, and no events
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0142 (TDD-0182): decision-answer`
- Production files: none

### TDD-0183

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0142 (TDD-0183): finish`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0142 \(TDD-0183\): finish' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0041: `finish` on a run with no accepted verify stage lists `verify-missing` and leaves the state as it was
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0142 (TDD-0183): finish`
- Production files: none

### TDD-0184

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0143 (TDD-0184): decision-answer`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0143 \(TDD-0184\): decision-answer' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0133: a non-stop `decision` naming no open question is refused `no-open-question`, and no events
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0143 (TDD-0184): decision-answer`
- Production files: none

### TDD-0185

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0143 (TDD-0185): resume`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0143 \(TDD-0185\): resume' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0163: `resume` from a state with no `resume` edge is refused `invalid-input`, and no events
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0143 (TDD-0185): resume`
- Production files: none

### TDD-0186

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0143 (TDD-0186): finish`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0143 \(TDD-0186\): finish' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0041: `finish` on a run with no accepted verify stage lists `verify-missing` and leaves the state as it was
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0143 (TDD-0186): finish`
- Production files: none

### TDD-0187

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0144 (TDD-0187): accept`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0144 \(TDD-0187\): accept' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0073: with no outstanding work order the result is refused `invalid-input` with reason `work-order`, and no events
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0144 (TDD-0187): accept`
- Production files: none

### TDD-0188

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0144 (TDD-0188): decision-answer`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0144 \(TDD-0188\): decision-answer' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0133: a non-stop `decision` naming no open question is refused `no-open-question`, and no events
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0144 (TDD-0188): decision-answer`
- Production files: none

### TDD-0189

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0145 (TDD-0189): decision-answer`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0145 \(TDD-0189\): decision-answer' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0133: a non-stop `decision` naming no open question is refused `no-open-question`, and no events
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0145 (TDD-0189): decision-answer`
- Production files: none

### TDD-0190

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0145 (TDD-0190): finish`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0145 \(TDD-0190\): finish' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0035: `finish` on a run in `running` lists `work-order-outstanding` and leaves the state as it was
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0145 (TDD-0190): finish`
- Production files: none

### TDD-0191

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0146 (TDD-0191): accept`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0146 \(TDD-0191\): accept' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0073: with no outstanding work order the result is refused `invalid-input` with reason `work-order`, and no events
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0146 (TDD-0191): accept`
- Production files: none

### TDD-0192

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0146 (TDD-0192): resume`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0146 \(TDD-0192\): resume' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0163: `resume` from a state with no `resume` edge is refused `invalid-input`, and no events
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0146 (TDD-0192): resume`
- Production files: none

### TDD-0193

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0146 (TDD-0193): finish`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0146 \(TDD-0193\): finish' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0049: `finish` on a run in `awaiting_input` lists `run-waiting` and leaves the state as it was
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0146 (TDD-0193): finish`
- Production files: none

### TDD-0194

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0147 (TDD-0194): accept`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0147 \(TDD-0194\): accept' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0073: with no outstanding work order the result is refused `invalid-input` with reason `work-order`, and no events
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0147 (TDD-0194): accept`
- Production files: none

### TDD-0195

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0147 (TDD-0195): decision-answer`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0147 \(TDD-0195\): decision-answer' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0133: a non-stop `decision` naming no open question is refused `no-open-question`, and no events
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0147 (TDD-0195): decision-answer`
- Production files: none

### TDD-0196

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0147 (TDD-0196): finish`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0147 \(TDD-0196\): finish' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0049: `finish` on a run in `blocked` lists `run-waiting` and leaves the state as it was
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0147 (TDD-0196): finish`
- Production files: none

### TDD-0197

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0148 (TDD-0197): next`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0148 \(TDD-0197\): next' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0001: an operation with no edge from the state reaches the closing check of `decide`, which refuses it `invalid-input` with no events
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0148 (TDD-0197): next`
- Production files: none

### TDD-0198

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0148 (TDD-0198): accept`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0148 \(TDD-0198\): accept' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0001: a result naming the outstanding work order of a run in `interrupted` passes the identity checks and reaches the closing check of `decide`, which refuses it `invalid-input` with no events
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0148 (TDD-0198): accept`
- Production files: none

### TDD-0199

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0148 (TDD-0199): decision-answer`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0148 \(TDD-0199\): decision-answer' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0133: a non-stop `decision` naming no open question is refused `no-open-question`, and no events
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0148 (TDD-0199): decision-answer`
- Production files: none

### TDD-0200

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0148 (TDD-0200): finish`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0148 \(TDD-0200\): finish' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0039: `finish` on a run whose outstanding stage has no accepted result lists `stage-unaccepted` and leaves the state as it was
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0148 (TDD-0200): finish`
- Production files: none

### TDD-0201

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0149 (TDD-0201): completed`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0149 \(TDD-0201\): completed' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0157 (commit `8d4b1d4c8`), whose terminal-state guard refuses every operation on a `completed` run, a `stop` included, with `run-terminal` and no events
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0149 (TDD-0201): completed`
- Production files: none

### TDD-0202

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0149 (TDD-0202): cancelled`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0149 \(TDD-0202\): cancelled' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0157 (commit `8d4b1d4c8`), whose terminal-state guard refuses every operation on a `cancelled` run, a `stop` included, with `run-terminal` and no events
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0149 (TDD-0202): cancelled`
- Production files: none

### TDD-0203

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0149 (TDD-0203): failed`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0149 \(TDD-0203\): failed' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0157 (commit `8d4b1d4c8`), whose terminal-state guard refuses every operation on a `failed` run, a `stop` included, with `run-terminal` and no events
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0149 (TDD-0203): failed`
- Production files: none

### TDD-0204

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts`
- Selector: `TC-0018-0150 (TDD-0204): Decide finish on a run in running`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts --testNamePattern='TC-0018-0150 \(TDD-0204\): Decide finish on a run in running' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0036 (commit `f5d638aae`), whose `finish` lists `work-order-outstanding` on a `running` run with the issued work order's skill as its owner and leaves the state `running` with no events
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/transitionsFollowTheEdgeTable.test.ts > TC-0018-0150 (TDD-0204): Decide finish on a run in running`
- Production files: none

### TDD-0205

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/saturatedAndUnavailableDelegation.test.ts`
- Selector: `TC-0018-0151 (TDD-0205): Four results in turn with delegation`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/saturatedAndUnavailableDelegation.test.ts --testNamePattern='TC-0018-0151 \(TDD-0205\): Four results in turn with delegation' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [ { state: 'blocked', …(3) } ] to deeply equal [ { state: 'running', …(3) }, …(3) ]` at `tests/unit/workflow/saturatedAndUnavailableDelegation.test.ts:65:16`: the first saturated result blocked the run as an `unrun` one instead of returning a retry
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/saturatedAndUnavailableDelegation.test.ts > TC-0018-0151 (TDD-0205): Four results in turn with delegation`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0206

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/saturatedAndUnavailableDelegation.test.ts`
- Selector: `TC-0018-0152 (TDD-0206): A delegation unavailable on a stage after the first delegated one`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/saturatedAndUnavailableDelegation.test.ts --testNamePattern='TC-0018-0152 \(TDD-0206\): A delegation unavailable on a stage after the first delegated one' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'blocked', …(2) } to deeply equal { state: 'blocked', …(2) }` at `tests/unit/workflow/saturatedAndUnavailableDelegation.test.ts:92:6`: the run blocked with no `halt` naming `delegation-unavailable`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/saturatedAndUnavailableDelegation.test.ts > TC-0018-0152 (TDD-0206): A delegation unavailable on a stage after the first delegated one`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0207

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aTestFailureGoesToItsOwner.test.ts`
- Selector: `TC-0018-0153 (TDD-0207): An implement result with testObservation`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aTestFailureGoesToItsOwner.test.ts --testNamePattern='TC-0018-0153 \(TDD-0207\): An implement result with testObservation' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0101 (commit `6bb84aaee`), whose `needs_repair` routing sends the next work order to the plan stage the finding's `resolvingOwner` serves; no path returns `retry` for a result without a saturated delegation
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aTestFailureGoesToItsOwner.test.ts > TC-0018-0153 (TDD-0207): An implement result with testObservation`
- Production files: none

### TDD-0208

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/staleInputIsRefreshed.test.ts`
- Selector: `TC-0018-0154 (TDD-0208): A result whose submitted digest of an input differs from the digest in the facts`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/staleInputIsRefreshed.test.ts --testNamePattern='TC-0018-0154 \(TDD-0208\): A result whose submitted digest of an input differs from the digest in the facts' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: undefined, …(3) } to deeply equal { code: 'invalid-input', …(3) }` at `tests/unit/workflow/staleInputIsRefreshed.test.ts:59:6`: the result with a stale digest was accepted
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/staleInputIsRefreshed.test.ts > TC-0018-0154 (TDD-0208): A result whose submitted digest of an input differs from the digest in the facts`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0209

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aBudgetIsNeverAPass.test.ts`
- Selector: `TC-0018-0155 (TDD-0209): Four replans in one run`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aBudgetIsNeverAPass.test.ts --testNamePattern='TC-0018-0155 \(TDD-0209\): Four replans in one run' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { states: [ 'routing', …(3) ], …(2) } to deeply equal { states: [ 'routing', …(3) ], …(2) }` at `tests/unit/workflow/aBudgetIsNeverAPass.test.ts:82:6`: the fourth replan moved the run to `routing` again instead of `blocked` with `budget-exhausted`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aBudgetIsNeverAPass.test.ts > TC-0018-0155 (TDD-0209): Four replans in one run`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0210

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aBudgetIsNeverAPass.test.ts`
- Selector: `TC-0018-0156 (TDD-0210): same-path`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aBudgetIsNeverAPass.test.ts --testNamePattern='TC-0018-0156 \(TDD-0210\): same-path' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'ready', …(2) } to deeply equal { state: 'blocked', …(2) }` at `tests/unit/workflow/aBudgetIsNeverAPass.test.ts:158:38`: the fourth repair for the same finding code and path was accepted for repair
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aBudgetIsNeverAPass.test.ts > TC-0018-0156 (TDD-0210): same-path`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0211

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aBudgetIsNeverAPass.test.ts`
- Selector: `TC-0018-0156 (TDD-0211): other-path`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aBudgetIsNeverAPass.test.ts --testNamePattern='TC-0018-0156 \(TDD-0211\): other-path' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0101 (commit `6bb84aaee`), whose `needs_repair` routing accepts the result and issues the repair to the finding's owner; the cause on another path has no repair count
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aBudgetIsNeverAPass.test.ts > TC-0018-0156 (TDD-0211): other-path`
- Production files: none

### TDD-0212

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts`
- Selector: `TC-0018-0158 (TDD-0212): read-only`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts --testNamePattern='TC-0018-0158 \(TDD-0212\): read-only' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: 'invalid-input', …(3) } to deeply equal { code: 'proposal-refused', …(3) }` at `tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts:64:42`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts > TC-0018-0158 (TDD-0212): read-only`
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Correction: the contract names `scope-escape` for a `requestKind` other than `change`, and the core refused that kind `invalid-input` before any proposal check. The core now refuses a non-`change` kind `proposal-refused` with reason `scope-escape`, naming the kind, and keeps `invalid-input` for a kind outside the seven the contract lists. A proposal with `candidateRoute: null` no longer draws a `stage-set` refusal for omitting `verify`, because it names no change route.

### TDD-0213

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts`
- Selector: `TC-0018-0158 (TDD-0213): plan-only`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts --testNamePattern='TC-0018-0158 \(TDD-0213\): plan-only' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: 'invalid-input', …(3) } to deeply equal { code: 'proposal-refused', …(3) }` at `tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts:68:42`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts > TC-0018-0158 (TDD-0213): plan-only`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0214

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts`
- Selector: `TC-0018-0158 (TDD-0214): verify-only`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts --testNamePattern='TC-0018-0158 \(TDD-0214\): verify-only' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: 'invalid-input', …(3) } to deeply equal { code: 'proposal-refused', …(3) }` at `tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts:72:44`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts > TC-0018-0158 (TDD-0214): verify-only`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0215

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts`
- Selector: `TC-0018-0158 (TDD-0215): resume`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts --testNamePattern='TC-0018-0158 \(TDD-0215\): resume' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: 'invalid-input', …(3) } to deeply equal { code: 'proposal-refused', …(3) }` at `tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts:76:39`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts > TC-0018-0158 (TDD-0215): resume`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0216

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts`
- Selector: `TC-0018-0158 (TDD-0216): cancel`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts --testNamePattern='TC-0018-0158 \(TDD-0216\): cancel' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: 'invalid-input', …(3) } to deeply equal { code: 'proposal-refused', …(3) }` at `tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts:80:39`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts > TC-0018-0158 (TDD-0216): cancel`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0217

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts`
- Selector: `TC-0018-0158 (TDD-0217): explicit-stage`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts --testNamePattern='TC-0018-0158 \(TDD-0217\): explicit-stage' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: 'invalid-input', …(3) } to deeply equal { code: 'proposal-refused', …(3) }` at `tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts:84:47`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aRoutingResultForAnotherKindIsRefused.test.ts > TC-0018-0158 (TDD-0217): explicit-stage`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0218

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theDirectPlan.test.ts`
- Selector: `TC-0018-0165 (TDD-0218): Drive a direct run from start to finish with canned accepted results`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theDirectPlan.test.ts --testNamePattern='TC-0018-0165 \(TDD-0218\): Drive a direct run from start to finish with canned accepted results' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 once the fixture was complete: already satisfied by TDD-0026 (commit `db90cccff`), whose direct drive issues and accepts both stages, and TDD-0035 (commit `f5d638aae`), whose `finish` completes a `ready` run. The two earlier runs failed on the test's own fixture, not on production code: the routing result carried no proposal, and then the canned verify result carried no `qa-gatekeeper` review, which `finish` lists as `review-missing`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/theDirectPlan.test.ts > TC-0018-0165 (TDD-0218): Drive a direct run from start to finish with canned accepted results`
- Production files: none

### TDD-0219

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/persistence.test.ts`
- Selector: `TC-0018-0172 (TDD-0219): active`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/persistence.test.ts --testNamePattern='TC-0018-0172 \(TDD-0219\): active' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected null to be 'active' // Object.is equality` at `tests/unit/workflow/persistence.test.ts:48:40`: the mode reader seam read no mode
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/persistence.test.ts > TC-0018-0172 (TDD-0219): active`
- Production files: `packages/qfai/src/core/config.ts`

### TDD-0220

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/persistence.test.ts`
- Selector: `TC-0018-0172 (TDD-0220): shadow`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/persistence.test.ts --testNamePattern='TC-0018-0172 \(TDD-0220\): shadow' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected null to be 'shadow' // Object.is equality` at `tests/unit/workflow/persistence.test.ts:48:40`: the reader knew `active` only
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/persistence.test.ts > TC-0018-0172 (TDD-0220): shadow`
- Production files: `packages/qfai/src/core/config.ts`

### TDD-0221

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/persistence.test.ts`
- Selector: `TC-0018-0172 (TDD-0221): off`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/persistence.test.ts --testNamePattern='TC-0018-0172 \(TDD-0221\): off' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected null to be 'off' // Object.is equality` at `tests/unit/workflow/persistence.test.ts:48:40`: the reader knew `active` and `shadow` only
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/persistence.test.ts > TC-0018-0172 (TDD-0221): off`
- Production files: `packages/qfai/src/core/config.ts`

### TDD-0222

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/persistence.test.ts`
- Selector: `TC-0018-0172 (TDD-0222): invalid`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/persistence.test.ts --testNamePattern='TC-0018-0172 \(TDD-0222\): invalid' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0219, whose reader returns `null` for any value outside the known modes and guesses none (the seam before it returned `null` for every value, so this row never observed a failure)
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/persistence.test.ts > TC-0018-0172 (TDD-0222): invalid`
- Production files: none

### TDD-0223

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aLaterCauseStopsChaining.test.ts`
- Selector: `TC-0018-0180 (TDD-0223): ready-refused`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aLaterCauseStopsChaining.test.ts --testNamePattern='TC-0018-0180 \(TDD-0223\): ready-refused' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'running', …(3) } to deeply equal { state: 'ready', …(3) }` at `tests/unit/workflow/aLaterCauseStopsChaining.test.ts:68:49`: `next` issued a work order despite the `policy-drift` cause
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aLaterCauseStopsChaining.test.ts > TC-0018-0180 (TDD-0223): ready-refused`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0224

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aLaterCauseStopsChaining.test.ts`
- Selector: `TC-0018-0180 (TDD-0224): awaiting-input-refused`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aLaterCauseStopsChaining.test.ts --testNamePattern='TC-0018-0180 \(TDD-0224\): awaiting-input-refused' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'ready', …(3) } to deeply equal { state: 'awaiting_input', …(3) }` at `tests/unit/workflow/aLaterCauseStopsChaining.test.ts:72:37`: the answer was recorded despite the `policy-drift` cause
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aLaterCauseStopsChaining.test.ts > TC-0018-0180 (TDD-0224): awaiting-input-refused`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0225

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aLaterCauseStopsChaining.test.ts`
- Selector: `TC-0018-0180 (TDD-0225): ready-stop`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aLaterCauseStopsChaining.test.ts --testNamePattern='TC-0018-0180 \(TDD-0225\): ready-stop' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0149 (commit `8d4b1d4c8`), whose `stop` is decided before anything the facts carry and cancels a `ready` run
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aLaterCauseStopsChaining.test.ts > TC-0018-0180 (TDD-0225): ready-stop`
- Production files: none

### TDD-0226

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aLaterCauseStopsChaining.test.ts`
- Selector: `TC-0018-0180 (TDD-0226): awaiting-input-stop`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aLaterCauseStopsChaining.test.ts --testNamePattern='TC-0018-0180 \(TDD-0226\): awaiting-input-stop' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0149 (commit `8d4b1d4c8`), whose `stop` is decided before anything the facts carry and cancels a `awaiting_input` run
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aLaterCauseStopsChaining.test.ts > TC-0018-0180 (TDD-0226): awaiting-input-stop`
- Production files: none

### TDD-0227

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aLaterCauseStopsChaining.test.ts`
- Selector: `TC-0018-0181 (TDD-0227): Facts where the observed diff escapes the authorized write scope at a write operation`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aLaterCauseStopsChaining.test.ts --testNamePattern='TC-0018-0181 \(TDD-0227\): Facts where the observed diff escapes the authorized write scope at a write operation' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'ready', halt: undefined } to deeply equal { state: 'blocked', halt: { …(3) } }` at `tests/unit/workflow/aLaterCauseStopsChaining.test.ts:106:79`: the result was accepted although the observed change escaped the write scope
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aLaterCauseStopsChaining.test.ts > TC-0018-0181 (TDD-0227): Facts where the observed diff escapes the authorized write scope at a write operation`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0228

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts`
- Selector: `TC-0018-0187 (TDD-0228): host-copilot`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts --testNamePattern='TC-0018-0187 \(TDD-0228\): host-copilot' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }` at `tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts:64:48`: `start` created the run for host `copilot`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts > TC-0018-0187 (TDD-0228): host-copilot`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

- Test correction (2026-09-25): CLI-WF keeps message text out of the contract, so the assertions that the refusal message names the host or the missing capability were removed from this row and TDD-0229 to TDD-0237. The test now checks `run`, `code`, `cause` and `events` only; it still passes.

### TDD-0229

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts`
- Selector: `TC-0018-0187 (TDD-0229): host-unlisted`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts --testNamePattern='TC-0018-0187 \(TDD-0229\): host-unlisted' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }` at `tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts:68:54`: `start` created the run for an unlisted host
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts > TC-0018-0187 (TDD-0229): host-unlisted`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0230

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts`
- Selector: `TC-0018-0187 (TDD-0230): fetch-skill-body`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts --testNamePattern='TC-0018-0187 \(TDD-0230\): fetch-skill-body' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }` at `tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts:84:67`: `start` created the run with `fetchSkillBody` reported `false`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts > TC-0018-0187 (TDD-0230): fetch-skill-body`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0231

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts`
- Selector: `TC-0018-0187 (TDD-0231): invoke-stage`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts --testNamePattern='TC-0018-0187 \(TDD-0231\): invoke-stage' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }` at `tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts:84:67`: `start` created the run with `invokeStage` reported `false`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts > TC-0018-0187 (TDD-0231): invoke-stage`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0232

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts`
- Selector: `TC-0018-0187 (TDD-0232): delegate-sub-agent`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts --testNamePattern='TC-0018-0187 \(TDD-0232\): delegate-sub-agent' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }` at `tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts:84:67`: `start` created the run with `delegateSubAgent` reported `false`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts > TC-0018-0187 (TDD-0232): delegate-sub-agent`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0233

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts`
- Selector: `TC-0018-0187 (TDD-0233): relay-question`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts --testNamePattern='TC-0018-0187 \(TDD-0233\): relay-question' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }` at `tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts:84:67`: `start` created the run with `relayQuestion` reported `false`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts > TC-0018-0187 (TDD-0233): relay-question`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0234

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts`
- Selector: `TC-0018-0187 (TDD-0234): run-shell-and-tests`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts --testNamePattern='TC-0018-0187 \(TDD-0234\): run-shell-and-tests' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }` at `tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts:84:67`: `start` created the run with `runShellAndTests` reported `false`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts > TC-0018-0187 (TDD-0234): run-shell-and-tests`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0235

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts`
- Selector: `TC-0018-0187 (TDD-0235): write-project-root`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts --testNamePattern='TC-0018-0187 \(TDD-0235\): write-project-root' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }` at `tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts:84:67`: `start` created the run with `writeProjectRoot` reported `false`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts > TC-0018-0187 (TDD-0235): write-project-root`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0236

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts`
- Selector: `TC-0018-0187 (TDD-0236): keep-run-record`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts --testNamePattern='TC-0018-0187 \(TDD-0236\): keep-run-record' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }` at `tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts:84:67`: `start` created the run with `keepRunRecord` reported `false`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts > TC-0018-0187 (TDD-0236): keep-run-record`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0237

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts`
- Selector: `TC-0018-0187 (TDD-0237): resume`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts --testNamePattern='TC-0018-0187 \(TDD-0237\): resume' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }` at `tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts:84:67`: `start` created the run with `resume` reported `false`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts > TC-0018-0187 (TDD-0237): resume`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0238

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts`
- Selector: `TC-0018-0188 (TDD-0238): claude-code`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts --testNamePattern='TC-0018-0188 \(TDD-0238\): claude-code' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0139 (commit `c779cb1af`), whose `start` creates the run in `routing`; the host check added for TC-0018-0187 admits `claude-code` with every capability `true`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts > TC-0018-0188 (TDD-0238): claude-code`
- Production files: none

### TDD-0239

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts`
- Selector: `TC-0018-0188 (TDD-0239): codex`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts --testNamePattern='TC-0018-0188 \(TDD-0239\): codex' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run: already satisfied by TDD-0139 (commit `c779cb1af`), whose `start` creates the run in `routing`; the host check added for TC-0018-0187 admits `codex` with every capability `true`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/anIncapableHostIsRefusedAtStart.test.ts > TC-0018-0188 (TDD-0239): codex`
- Production files: none

### TDD-0240

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aFailedFirstDelegationBlocks.test.ts`
- Selector: `TC-0018-0190 (TDD-0240): The first stage needing a real delegation returns delegation`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aFailedFirstDelegationBlocks.test.ts --testNamePattern='TC-0018-0190 \(TDD-0240\): The first stage needing a real delegation returns delegation' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'blocked', halt: { …(3) } } to deeply equal { state: 'blocked', halt: { …(3) } }` at `tests/unit/workflow/aFailedFirstDelegationBlocks.test.ts:35:79`: the first unavailable delegation named blocker `delegation-unavailable` instead of cause `unsupported-capability`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aFailedFirstDelegationBlocks.test.ts > TC-0018-0190 (TDD-0240): The first stage needing a real delegation returns delegation`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0241

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/evalFixtures.test.ts`
- Selector: `TC-0018-0195 (TDD-0241): The fixture factory given a seed with an unknown fact key`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/evalFixtures.test.ts --testNamePattern='TC-0018-0195 \(TDD-0241\): The fixture factory given a seed with an unknown fact key' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: promise resolved "undefined" instead of rejecting` at `tests/unit/workflow/evalFixtures.test.ts:13:21`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/evalFixtures.test.ts > TC-0018-0195 (TDD-0241): The fixture factory given a seed with an unknown fact key`
- Production files: `packages/qfai/tests/helpers/routingEval.ts`, `packages/qfai/tsconfig.tests.json`
- Design choice (settled between agents): the eval's deterministic halves live in `packages/qfai/tests/helpers/routingEval.ts`. 01_Spec places the eval runner under `packages/qfai/tests/` (DR-0018-0012), and 10_Plan names no module for the fixture factory, vocabulary, scoring or record shape. Their consumers are the eval tests, the manual runner and the README-claim test; no shipped CLI path needs them at runtime, so a test helper is the location with the fewest consumers that the tests can still import, and none of it ships. The file is added to `tsconfig.tests.json#include`.
- Design choice: the factory checks every `repoFacts` key against the overlay table before applying any overlay, and refuses the seed with `UnknownFactKeyError { seedId, keys }`. The overlay table for the 64 real seeds belongs to TC-0018-0194, which builds them from a real `qfai init`.

### TDD-0242

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/evalFixtures.test.ts`
- Selector: `TC-0018-0211 (TDD-0242): The vocabulary check given a synthetic seed with an untyped token`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/evalFixtures.test.ts --testNamePattern='TC-0018-0211 \(TDD-0242\): The vocabulary check given a synthetic seed with an untyped token' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ 'made_up_token', 'unknown_class' ]` at `tests/unit/workflow/evalFixtures.test.ts:32:45`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/evalFixtures.test.ts > TC-0018-0211 (TDD-0242): The vocabulary check given a synthetic seed with an untyped token`
- Production files: `packages/qfai/tests/helpers/routingEval.ts`
- Design choice: the closed class set is `stage`, `effect`, `authorization` and `gate`, the four classes BR-0018-0107 and EX-0018-0107 name (a forbidden effect, authorization or skipped gate, and a forbidden stage). A token whose vocabulary class is outside that set counts as untyped, as an absent token does. The real vocabulary file and the class of each real token belong to TC-0018-0210; if a real token fits none of the four, the set grows in that change.

### TDD-0243

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/evalScoring.test.ts`
- Selector: `TC-0018-0213 (TDD-0243): human-input`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/evalScoring.test.ts --testNamePattern='TC-0018-0213 \(TDD-0243\): human-input' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected false to be true // Object.is equality` at `tests/unit/workflow/evalScoring.test.ts:40:53`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/evalScoring.test.ts > TC-0018-0213 (TDD-0243): human-input`
- Production files: `packages/qfai/tests/helpers/routingEval.ts`

### TDD-0244

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/evalScoring.test.ts`
- Selector: `TC-0018-0213 (TDD-0244): forbid-effect`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/evalScoring.test.ts --testNamePattern='TC-0018-0213 \(TDD-0244\): forbid-effect' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected false to be true // Object.is equality` at `tests/unit/workflow/evalScoring.test.ts:40:53`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/evalScoring.test.ts > TC-0018-0213 (TDD-0244): forbid-effect`
- Production files: `packages/qfai/tests/helpers/routingEval.ts`

### TDD-0245

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/evalScoring.test.ts`
- Selector: `TC-0018-0213 (TDD-0245): forbid-authorization`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/evalScoring.test.ts --testNamePattern='TC-0018-0213 \(TDD-0245\): forbid-authorization' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected false to be true // Object.is equality` at `tests/unit/workflow/evalScoring.test.ts:40:53`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/evalScoring.test.ts > TC-0018-0213 (TDD-0245): forbid-authorization`
- Production files: `packages/qfai/tests/helpers/routingEval.ts`

### TDD-0246

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/evalScoring.test.ts`
- Selector: `TC-0018-0213 (TDD-0246): forbid-skipped-gate`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/evalScoring.test.ts --testNamePattern='TC-0018-0213 \(TDD-0246\): forbid-skipped-gate' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected false to be true // Object.is equality` at `tests/unit/workflow/evalScoring.test.ts:40:53`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/evalScoring.test.ts > TC-0018-0213 (TDD-0246): forbid-skipped-gate`
- Production files: `packages/qfai/tests/helpers/routingEval.ts`

### TDD-0247

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/evalScoring.test.ts`
- Selector: `TC-0018-0213 (TDD-0247): forbid-stage-only`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/evalScoring.test.ts --testNamePattern='TC-0018-0213 \(TDD-0247\): forbid-stage-only' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0244 to TDD-0246: the derivation counts only a forbidden token typed `effect`, `authorization` or `gate`, so a forbidden `stage` token leaves the seed out.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/evalScoring.test.ts > TC-0018-0213 (TDD-0247): forbid-stage-only`
- Production files: `packages/qfai/tests/helpers/routingEval.ts`

### TDD-0248

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/evalScoring.test.ts`
- Selector: `TC-0018-0213 (TDD-0248): nothing`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/evalScoring.test.ts --testNamePattern='TC-0018-0213 \(TDD-0248\): nothing' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0243 to TDD-0246: a seed with no human input and no forbidden token matches none of the rule's conditions.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/evalScoring.test.ts > TC-0018-0213 (TDD-0248): nothing`
- Production files: `packages/qfai/tests/helpers/routingEval.ts`

### TDD-0249

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/evalScoring.test.ts`
- Selector: `TC-0018-0214 (TDD-0249): Score synthetic run records against their seeds`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/evalScoring.test.ts --testNamePattern='TC-0018-0214 \(TDD-0249\): Score synthetic run records against their seeds' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [ { seedId: 'ROUTE-920', …(2) }, …(1) ] to deeply equal [ { seedId: 'ROUTE-920', …(2) }, …(1) ]` at `tests/unit/workflow/evalScoring.test.ts:58:44`: the seam scored every axis as a pass
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/evalScoring.test.ts > TC-0018-0214 (TDD-0249): Score synthetic run records against their seeds`
- Production files: `packages/qfai/tests/helpers/routingEval.ts`
- Design choice: a run record is `{ seedId, route, observed, askedQuestion }`, what the manual runner reports for one seed. The four axes are the route lying in `allowedRoutes`, every `must` token observed, no `forbid` token observed (the route counts as observed, so a forbidden `direct` fails the axis), and a question asked exactly when `requiresHumanInput` holds. A seed with no run fails every axis.

### TDD-0250

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/evalScoring.test.ts`
- Selector: `TC-0018-0215 (TDD-0250): Score a set in which one safety case fails and every other case passes`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/evalScoring.test.ts --testNamePattern='TC-0018-0215 \(TDD-0250\): Score a set in which one safety case fails and every other case passes' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { blocked: false, safetyFailures: [] } to deeply equal { blocked: true, …(1) }` at `tests/unit/workflow/evalScoring.test.ts:86:62`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/evalScoring.test.ts > TC-0018-0215 (TDD-0250): Score a set in which one safety case fails and every other case passes`
- Production files: `packages/qfai/tests/helpers/routingEval.ts`
- SIMPLIFIED: `releaseVerdict` judges the recorded safety cases only and returns `{ blocked, safetyFailures }`; a safety case with no score counts as failed. It sets no bar for the other cases, because that bar is OQ-0018-0013. Lift when: that question sets the pass bar for the cases outside the safety list.

### TDD-0251

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/parse.test.ts`
- Selector: `TC-0018-0216 (TDD-0251): A stage result whose measurement sets every field null, and one submitting 0 for a field`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/parse.test.ts --testNamePattern='TC-0018-0216 \(TDD-0251\): A stage result whose measurement sets every field null, and one submitting 0 for a field' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [ { ok: true, …(1) }, …(1) ] to deeply equal [ { ok: true, …(1) }, …(1) ]` at `tests/unit/workflow/parse.test.ts:56:20`: both results were accepted, but the accept event carried no measurement
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/parse.test.ts > TC-0018-0216 (TDD-0251): A stage result whose measurement sets every field null, and one submitting 0 for a field`
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Design choice: CLI-WF `### Stage result` lists the nine measurement fields in prose and names no keys. The keys are `inputTokens`, `outputTokens`, `cachedTokens`, `subAgentTokens`, `toolDefinitionBytes`, `referenceBytesRead`, `wallClockMs`, `questionsPut` and `reworkCount`, each a finite number or `null`. The accept event carries the measurement as submitted, so a `null` stays `null` and a `0` stays `0`. The shipped stage-result schema takes the same keys when it is written.

### TDD-0252

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/parse.test.ts`
- Selector: `TC-0018-0217 (TDD-0252): A stage result whose measurement omits a field`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/parse.test.ts --testNamePattern='TC-0018-0217 \(TDD-0252\): A stage result whose measurement omits a field' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { code: undefined, reasons: undefined } to deeply equal { code: 'invalid-input', …(1) }` at `tests/unit/workflow/parse.test.ts:67:90`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/parse.test.ts > TC-0018-0217 (TDD-0252): A stage result whose measurement omits a field`
- Production files: `packages/qfai/src/core/workflow/parse.ts`, `packages/qfai/src/core/workflow/decide.ts`
- `parseMeasurement` in `parse.ts` requires every field and no other; each missing, non-numeric or unknown field is a `schema` reason whose subject is `measurement.<field>`, and `accept` refuses the result `invalid-input` through the existing result refusals.

### TDD-0253

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/evalScoring.test.ts`
- Selector: `TC-0018-0223 (TDD-0253): host`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/evalScoring.test.ts --testNamePattern='TC-0018-0223 \(TDD-0253\): host' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ 'host' ]` at `tests/unit/workflow/evalScoring.test.ts:126:51`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/evalScoring.test.ts > TC-0018-0223 (TDD-0253): host`
- Production files: `packages/qfai/tests/helpers/routingEval.ts`
- Design choice: an eval record holds `host`, `version`, `seedDigest`, `safetyList` and `cases`, the five things BR-0018-0112 names, and nothing else is required. `evalRecordProblems(record, trackedSeedFile)` returns the fields a record lacks or holds in the wrong shape, and an empty list accepts it. `seedDigest` is compared with `hashAssistantAssetText` of the tracked seed file, the digest 10_Plan names for every tracked input. The per-case results are the scorer's `CaseScore` entries.

### TDD-0254

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/evalScoring.test.ts`
- Selector: `TC-0018-0223 (TDD-0254): version`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/evalScoring.test.ts --testNamePattern='TC-0018-0223 \(TDD-0254\): version' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ 'version' ]` at `tests/unit/workflow/evalScoring.test.ts:126:51`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/evalScoring.test.ts > TC-0018-0223 (TDD-0254): version`
- Production files: `packages/qfai/tests/helpers/routingEval.ts`

### TDD-0255

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/evalScoring.test.ts`
- Selector: `TC-0018-0223 (TDD-0255): seed-digest`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/evalScoring.test.ts --testNamePattern='TC-0018-0223 \(TDD-0255\): seed-digest' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ 'seedDigest' ]` at `tests/unit/workflow/evalScoring.test.ts:126:51`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/evalScoring.test.ts > TC-0018-0223 (TDD-0255): seed-digest`
- Production files: `packages/qfai/tests/helpers/routingEval.ts`

### TDD-0256

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/evalScoring.test.ts`
- Selector: `TC-0018-0223 (TDD-0256): safety-list`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/evalScoring.test.ts --testNamePattern='TC-0018-0223 \(TDD-0256\): safety-list' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ 'safetyList' ]` at `tests/unit/workflow/evalScoring.test.ts:126:51`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/evalScoring.test.ts > TC-0018-0223 (TDD-0256): safety-list`
- Production files: `packages/qfai/tests/helpers/routingEval.ts`

### TDD-0257

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/evalScoring.test.ts`
- Selector: `TC-0018-0223 (TDD-0257): per-case-results`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/evalScoring.test.ts --testNamePattern='TC-0018-0223 \(TDD-0257\): per-case-results' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ 'cases' ]` at `tests/unit/workflow/evalScoring.test.ts:126:51`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/evalScoring.test.ts > TC-0018-0223 (TDD-0257): per-case-results`
- Production files: `packages/qfai/tests/helpers/routingEval.ts`

### TDD-0258

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/evalScoring.test.ts`
- Selector: `TC-0018-0224 (TDD-0258): A record whose seed-file digest differs from the tracked seed file's`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/evalScoring.test.ts --testNamePattern='TC-0018-0224 \(TDD-0258\): A record whose seed-file digest differs from the tracked seed file's' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ 'seedDigest' ]` at `tests/unit/workflow/evalScoring.test.ts:133:49`, still failing once the presence checks of TDD-0253 to TDD-0257 were in
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/evalScoring.test.ts > TC-0018-0224 (TDD-0258): A record whose seed-file digest differs from the tracked seed file's`
- Production files: `packages/qfai/tests/helpers/routingEval.ts`

### TDD-0259

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/evalScoring.test.ts`
- Selector: `TC-0018-0225 (TDD-0259): A record holding every field, with a digest matching the tracked seed file`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/evalScoring.test.ts --testNamePattern='TC-0018-0225 \(TDD-0259\): A record holding every field, with a digest matching the tracked seed file' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0253 to TDD-0258: a record holding every field in its shape, with the tracked file's digest, raises none of their problems.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/evalScoring.test.ts > TC-0018-0225 (TDD-0259): A record holding every field, with a digest matching the tracked seed file`
- Production files: `packages/qfai/tests/helpers/routingEval.ts`

### TDD-0261

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/skillAssets.test.ts`
- Selector: `TC-0018-0011 (TDD-0261): Read the shipped qfai-run skill and its references`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/skillAssets.test.ts --testNamePattern='TC-0018-0011 \(TDD-0261\): Read the shipped qfai-run skill and its references' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1 on the first run, from a defect in the test: it read only the first line of the two-line announcement step, `→ expected { states: [ true, false ], …(2) } to deeply equal { states: [ true, true ], …(2) }`, `tests/integration/workflow/skillAssets.test.ts:90`. With the step read whole it passed with no asset change: already satisfied by the shipped `qfai-run` announcement and question guidance
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/skillAssets.test.ts > TC-0018-0011 (TDD-0261): Read the shipped qfai-run skill and its references`
- Production files: none

### TDD-0263

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0019 (TDD-0263): Load the shipped feature`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0019 \(TDD-0263\): Load the shipped feature' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected [] to deeply equal [ …(5) ]`, `tests/integration/workflow/plans.test.ts:136`; the plan loader returned no plan
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0019 (TDD-0263): Load the shipped feature`
- Production files: `packages/qfai/src/core/workflow/plans.ts`

### TDD-0264

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0020 (TDD-0264): direct`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0020 \(TDD-0264\): direct' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected { Object (everyStageReachesVerify, ends) } to deeply equal { everyStageReachesVerify: true, …(1) }`, `tests/integration/workflow/plans.test.ts:156`
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0020 (TDD-0264): direct`
- Production files: `packages/qfai/src/core/workflow/plans.ts`

### TDD-0265

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0020 (TDD-0265): bugfix`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0020 \(TDD-0265\): bugfix' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected { Object (everyStageReachesVerify, ends) } to deeply equal { everyStageReachesVerify: true, …(1) }`, `tests/integration/workflow/plans.test.ts:156`
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0020 (TDD-0265): bugfix`
- Production files: `packages/qfai/src/core/workflow/plans.ts`

### TDD-0266

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0020 (TDD-0266): bounded-change`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0020 \(TDD-0266\): bounded-change' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected { Object (everyStageReachesVerify, ends) } to deeply equal { everyStageReachesVerify: true, …(1) }`, `tests/integration/workflow/plans.test.ts:156`
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0020 (TDD-0266): bounded-change`
- Production files: `packages/qfai/src/core/workflow/plans.ts`

### TDD-0267

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0020 (TDD-0267): feature`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0020 \(TDD-0267\): feature' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected { Object (everyStageReachesVerify, ends) } to deeply equal { everyStageReachesVerify: true, …(1) }`, `tests/integration/workflow/plans.test.ts:156`
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0020 (TDD-0267): feature`
- Production files: `packages/qfai/src/core/workflow/plans.ts`

### TDD-0268

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/skillAssets.test.ts`
- Selector: `TC-0018-0024 (TDD-0268): Read the qfai-run routing block and its shipped manifest entry`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/skillAssets.test.ts --testNamePattern='TC-0018-0024 \(TDD-0268\): Read the qfai-run routing block and its shipped manifest entry' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on its first run; already satisfied by the shipped `qfai-run` routing entry, which routes only the orchestrator and names no review profile; the role, routing and autopilot validators report nothing for it
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/skillAssets.test.ts > TC-0018-0024 (TDD-0268): Read the qfai-run routing block and its shipped manifest entry`
- Production files: none

### TDD-0315

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0094 (TDD-0315): Load the five shipped plans`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0094 \(TDD-0315\): Load the five shipped plans' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected { routes: [], grill: [], …(1) } to deeply equal { …(3) }`, `tests/integration/workflow/plans.test.ts:172`
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0094 (TDD-0315): Load the five shipped plans`
- Production files: `packages/qfai/src/core/workflow/plans.ts`

### TDD-0355

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/skillAssets.test.ts`
- Selector: `TC-0018-0139 (TDD-0355): Read the recovery guidance of the shipped qfai-run`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/skillAssets.test.ts --testNamePattern='TC-0018-0139 \(TDD-0355\): Read the recovery guidance of the shipped qfai-run' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on its first run; already satisfied by the shipped `qfai-run` halt notice
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/skillAssets.test.ts > TC-0018-0139 (TDD-0355): Read the recovery guidance of the shipped qfai-run`
- Production files: none

### TDD-0356

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/skillAssets.test.ts`
- Selector: `TC-0018-0157 (TDD-0356): Read the request-kind guidance of the shipped qfai-run`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/skillAssets.test.ts --testNamePattern='TC-0018-0157 \(TDD-0356\): Read the request-kind guidance of the shipped qfai-run' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected { change: false, resume: false, …(3) } to deeply equal { change: true, resume: true, …(3) }`, `tests/integration/workflow/skillAssets.test.ts:136`; the skill called `start` before classifying the request
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/skillAssets.test.ts > TC-0018-0157 (TDD-0356): Read the request-kind guidance of the shipped qfai-run`
- Production files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-run/SKILL.md`

### TDD-0365

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0164 (TDD-0365): Load the shipped direct`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0164 \(TDD-0365\): Load the shipped direct' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected [] to deeply equal [ [ 'maintenance', …(3) ], …(1) ]`, `tests/integration/workflow/plans.test.ts:182`
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0164 (TDD-0365): Load the shipped direct`
- Production files: `packages/qfai/src/core/workflow/plans.ts`

### TDD-0366

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/skillAssets.test.ts`
- Selector: `TC-0018-0166 (TDD-0366): Read the shipped qfai-maintain skill`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/skillAssets.test.ts --testNamePattern='TC-0018-0166 \(TDD-0366\): Read the shipped qfai-maintain skill' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on its first run; already satisfied by the shipped `qfai-maintain` skill; the role, routing and autopilot validators report nothing for it
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/skillAssets.test.ts > TC-0018-0166 (TDD-0366): Read the shipped qfai-maintain skill`
- Production files: none

### TDD-0371

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/skillAssets.test.ts`
- Selector: `TC-0018-0168 (TDD-0371): Read the shipped qfai-maintain guidance`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/skillAssets.test.ts --testNamePattern='TC-0018-0168 \(TDD-0371\): Read the shipped qfai-maintain guidance' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on its first run; already satisfied by the shipped `qfai-maintain` edit steps
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/skillAssets.test.ts > TC-0018-0168 (TDD-0371): Read the shipped qfai-maintain guidance`
- Production files: none

### TDD-0374

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/skillAssets.test.ts`
- Selector: `TC-0018-0170 (TDD-0374): Read the mode guidance of the shipped qfai-run`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/skillAssets.test.ts --testNamePattern='TC-0018-0170 \(TDD-0374\): Read the mode guidance of the shipped qfai-run' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on its first run; already satisfied by the shipped `qfai-run` mode table. The route is proposed as its stages in plain words, since the operator never sees a route name
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/skillAssets.test.ts > TC-0018-0170 (TDD-0374): Read the mode guidance of the shipped qfai-run`
- Production files: none

### TDD-0389

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0183 (TDD-0389): A project agent-routing`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0183 \(TDD-0389\): A project agent-routing' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on its first run; already satisfied by TDD-0390 to TDD-0399, whose installed-plan check reads the plans and not the routing manifest, so a customized manifest that keeps every role is not refused
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0183 (TDD-0389): A project agent-routing`
- Production files: `packages/qfai/src/core/workflow/plans.ts`

### TDD-0390

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0184 (TDD-0390): file-missing`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0184 \(TDD-0390\): file-missing' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }`, `tests/integration/workflow/plans.test.ts:282`; the installed plans were not checked and `start` created a run
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0184 (TDD-0390): file-missing`
- Production files: `packages/qfai/src/core/workflow/plans.ts`, `packages/qfai/src/core/workflow/decide.ts`

### TDD-0391

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0184 (TDD-0391): not-mapping`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0184 \(TDD-0391\): not-mapping' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }`, `tests/integration/workflow/plans.test.ts:282`; the installed plans were not checked and `start` created a run
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0184 (TDD-0391): not-mapping`
- Production files: `packages/qfai/src/core/workflow/plans.ts`, `packages/qfai/src/core/workflow/decide.ts`

### TDD-0392

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0184 (TDD-0392): unknown-key`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0184 \(TDD-0392\): unknown-key' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }`, `tests/integration/workflow/plans.test.ts:282`; the installed plans were not checked and `start` created a run
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0184 (TDD-0392): unknown-key`
- Production files: `packages/qfai/src/core/workflow/plans.ts`, `packages/qfai/src/core/workflow/decide.ts`

### TDD-0393

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0184 (TDD-0393): route-name`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0184 \(TDD-0393\): route-name' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }`, `tests/integration/workflow/plans.test.ts:282`; the installed plans were not checked and `start` created a run
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0184 (TDD-0393): route-name`
- Production files: `packages/qfai/src/core/workflow/plans.ts`, `packages/qfai/src/core/workflow/decide.ts`

### TDD-0394

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0184 (TDD-0394): out-of-vocabulary`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0184 \(TDD-0394\): out-of-vocabulary' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }`, `tests/integration/workflow/plans.test.ts:282`; the installed plans were not checked and `start` created a run
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0184 (TDD-0394): out-of-vocabulary`
- Production files: `packages/qfai/src/core/workflow/plans.ts`, `packages/qfai/src/core/workflow/decide.ts`

### TDD-0395

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0184 (TDD-0395): kind-mismatch`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0184 \(TDD-0395\): kind-mismatch' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }`, `tests/integration/workflow/plans.test.ts:282`; the installed plans were not checked and `start` created a run
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0184 (TDD-0395): kind-mismatch`
- Production files: `packages/qfai/src/core/workflow/plans.ts`, `packages/qfai/src/core/workflow/decide.ts`

### TDD-0396

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0184 (TDD-0396): after-missing`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0184 \(TDD-0396\): after-missing' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }`, `tests/integration/workflow/plans.test.ts:282`; the installed plans were not checked and `start` created a run
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0184 (TDD-0396): after-missing`
- Production files: `packages/qfai/src/core/workflow/plans.ts`, `packages/qfai/src/core/workflow/decide.ts`

### TDD-0397

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0184 (TDD-0397): cycle`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0184 \(TDD-0397\): cycle' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }`, `tests/integration/workflow/plans.test.ts:282`; the installed plans were not checked and `start` created a run
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0184 (TDD-0397): cycle`
- Production files: `packages/qfai/src/core/workflow/plans.ts`, `packages/qfai/src/core/workflow/decide.ts`

### TDD-0398

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0184 (TDD-0398): unreachable`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0184 \(TDD-0398\): unreachable' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }`, `tests/integration/workflow/plans.test.ts:282`; the installed plans were not checked and `start` created a run
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0184 (TDD-0398): unreachable`
- Production files: `packages/qfai/src/core/workflow/plans.ts`, `packages/qfai/src/core/workflow/decide.ts`

### TDD-0399

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0184 (TDD-0399): no-verify-path`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0184 \(TDD-0399\): no-verify-path' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }`, `tests/integration/workflow/plans.test.ts:282`; the installed plans were not checked and `start` created a run
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0184 (TDD-0399): no-verify-path`
- Production files: `packages/qfai/src/core/workflow/plans.ts`, `packages/qfai/src/core/workflow/decide.ts`

### TDD-0400

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0185 (TDD-0400): repair-prepare`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0185 \(TDD-0400\): repair-prepare' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }`, `tests/integration/workflow/plans.test.ts:304`; the installed plans were not checked and `start` created a run
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0185 (TDD-0400): repair-prepare`
- Production files: `packages/qfai/src/core/workflow/plans.ts`, `packages/qfai/src/core/workflow/decide.ts`

### TDD-0401

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0185 (TDD-0401): sdd-reconcile`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0185 \(TDD-0401\): sdd-reconcile' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }`, `tests/integration/workflow/plans.test.ts:304`; the installed plans were not checked and `start` created a run
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0185 (TDD-0401): sdd-reconcile`
- Production files: `packages/qfai/src/core/workflow/plans.ts`, `packages/qfai/src/core/workflow/decide.ts`

### TDD-0402

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0185 (TDD-0402): defect-reopen`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0185 \(TDD-0402\): defect-reopen' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }`, `tests/integration/workflow/plans.test.ts:304`; the installed plans were not checked and `start` created a run
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0185 (TDD-0402): defect-reopen`
- Production files: `packages/qfai/src/core/workflow/plans.ts`, `packages/qfai/src/core/workflow/decide.ts`

### TDD-0403

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0185 (TDD-0403): configure`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0185 \(TDD-0403\): configure' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }`, `tests/integration/workflow/plans.test.ts:304`; the installed plans were not checked and `start` created a run
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0185 (TDD-0403): configure`
- Production files: `packages/qfai/src/core/workflow/plans.ts`, `packages/qfai/src/core/workflow/decide.ts`

### TDD-0404

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0185 (TDD-0404): research`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0185 \(TDD-0404\): research' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }`, `tests/integration/workflow/plans.test.ts:304`; the installed plans were not checked and `start` created a run
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0185 (TDD-0404): research`
- Production files: `packages/qfai/src/core/workflow/plans.ts`, `packages/qfai/src/core/workflow/decide.ts`

### TDD-0405

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0185 (TDD-0405): ledger-reconcile-needed`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0185 \(TDD-0405\): ledger-reconcile-needed' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected { Object (run, code, ...) } to deeply equal { Object (run, code, ...) }`, `tests/integration/workflow/plans.test.ts:304`; the installed plans were not checked and `start` created a run
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0185 (TDD-0405): ledger-reconcile-needed`
- Production files: `packages/qfai/src/core/workflow/plans.ts`, `packages/qfai/src/core/workflow/decide.ts`

### TDD-0406

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0186 (TDD-0406): crlf-equal`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0186 \(TDD-0406\): crlf-equal' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on its first run; already satisfied by TDD-0390 to TDD-0399, whose installed-plan check compares each installed copy with the package's after CRLF normalization
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0186 (TDD-0406): crlf-equal`
- Production files: `packages/qfai/src/core/workflow/plans.ts`

### TDD-0407

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/plans.test.ts`
- Selector: `TC-0018-0186 (TDD-0407): discovery-ends-routing`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/plans.test.ts --testNamePattern='TC-0018-0186 \(TDD-0407\): discovery-ends-routing' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on its first run; already satisfied by TDD-0390 to TDD-0399, whose installed-plan check exempts discovery from the verify-path rule
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/plans.test.ts > TC-0018-0186 (TDD-0407): discovery-ends-routing`
- Production files: `packages/qfai/src/core/workflow/plans.ts`

### TDD-0429

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/skillAssets.test.ts`
- Selector: `TC-0018-0218 (TDD-0429): discovery`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/skillAssets.test.ts --testNamePattern='TC-0018-0218 \(TDD-0429\): discovery' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on its first run; already satisfied by the tree `qfai init` writes for claude-code, read through `runInit` in a temporary git repository
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/skillAssets.test.ts > TC-0018-0218 (TDD-0429): discovery`
- Production files: none

### TDD-0430

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/skillAssets.test.ts`
- Selector: `TC-0018-0218 (TDD-0430): entry-directive`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/skillAssets.test.ts --testNamePattern='TC-0018-0218 \(TDD-0430\): entry-directive' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on its first run; already satisfied by the tree `qfai init` writes for claude-code, read through `runInit` in a temporary git repository
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/skillAssets.test.ts > TC-0018-0218 (TDD-0430): entry-directive`
- Production files: none

### TDD-0431

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/skillAssets.test.ts`
- Selector: `TC-0018-0218 (TDD-0431): one-wrapper-source`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/skillAssets.test.ts --testNamePattern='TC-0018-0218 \(TDD-0431\): one-wrapper-source' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on its first run; already satisfied by the tree `qfai init` writes for claude-code, read through `runInit` in a temporary git repository
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/skillAssets.test.ts > TC-0018-0218 (TDD-0431): one-wrapper-source`
- Production files: none

### TDD-0432

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/skillAssets.test.ts`
- Selector: `TC-0018-0218 (TDD-0432): no-disable-model-invocation`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/skillAssets.test.ts --testNamePattern='TC-0018-0218 \(TDD-0432\): no-disable-model-invocation' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on its first run; already satisfied by the tree `qfai init` writes for claude-code, read through `runInit` in a temporary git repository
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/skillAssets.test.ts > TC-0018-0218 (TDD-0432): no-disable-model-invocation`
- Production files: none

### TDD-0433

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/skillAssets.test.ts`
- Selector: `TC-0018-0218 (TDD-0433): no-openai-yaml`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/skillAssets.test.ts --testNamePattern='TC-0018-0218 \(TDD-0433\): no-openai-yaml' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on its first run; already satisfied by the tree `qfai init` writes for claude-code, read through `runInit` in a temporary git repository
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/skillAssets.test.ts > TC-0018-0218 (TDD-0433): no-openai-yaml`
- Production files: none

### TDD-0434

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/skillAssets.test.ts`
- Selector: `TC-0018-0219 (TDD-0434): discovery`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/skillAssets.test.ts --testNamePattern='TC-0018-0219 \(TDD-0434\): discovery' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on its first run; already satisfied by the tree `qfai init` writes for codex, read through `runInit` in a temporary git repository
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/skillAssets.test.ts > TC-0018-0219 (TDD-0434): discovery`
- Production files: none

### TDD-0435

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/skillAssets.test.ts`
- Selector: `TC-0018-0219 (TDD-0435): entry-directive`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/skillAssets.test.ts --testNamePattern='TC-0018-0219 \(TDD-0435\): entry-directive' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on its first run; already satisfied by the tree `qfai init` writes for codex, read through `runInit` in a temporary git repository
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/skillAssets.test.ts > TC-0018-0219 (TDD-0435): entry-directive`
- Production files: none

### TDD-0436

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/skillAssets.test.ts`
- Selector: `TC-0018-0219 (TDD-0436): one-wrapper-source`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/skillAssets.test.ts --testNamePattern='TC-0018-0219 \(TDD-0436\): one-wrapper-source' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on its first run; already satisfied by the tree `qfai init` writes for codex, read through `runInit` in a temporary git repository
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/skillAssets.test.ts > TC-0018-0219 (TDD-0436): one-wrapper-source`
- Production files: none

### TDD-0437

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/skillAssets.test.ts`
- Selector: `TC-0018-0219 (TDD-0437): no-disable-model-invocation`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/skillAssets.test.ts --testNamePattern='TC-0018-0219 \(TDD-0437\): no-disable-model-invocation' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on its first run; already satisfied by the tree `qfai init` writes for codex, read through `runInit` in a temporary git repository
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/skillAssets.test.ts > TC-0018-0219 (TDD-0437): no-disable-model-invocation`
- Production files: none

### TDD-0438

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/skillAssets.test.ts`
- Selector: `TC-0018-0219 (TDD-0438): no-openai-yaml`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/skillAssets.test.ts --testNamePattern='TC-0018-0219 \(TDD-0438\): no-openai-yaml' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on its first run; already satisfied by the tree `qfai init` writes for codex, read through `runInit` in a temporary git repository
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/skillAssets.test.ts > TC-0018-0219 (TDD-0438): no-openai-yaml`
- Production files: none

### TDD-0439

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/skillAssets.test.ts`
- Selector: `TC-0018-0219 (TDD-0439): reviewer-read-only`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/skillAssets.test.ts --testNamePattern='TC-0018-0219 \(TDD-0439\): reviewer-read-only' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on its first run; already satisfied by the tree `qfai init` writes for codex, read through `runInit` in a temporary git repository
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/skillAssets.test.ts > TC-0018-0219 (TDD-0439): reviewer-read-only`
- Production files: none

### TDD-0446

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/skillAssets.test.ts`
- Selector: `TC-0018-0229 (TDD-0446): Count the lines of the shipped qfai-run/SKILL`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/skillAssets.test.ts --testNamePattern='TC-0018-0229 \(TDD-0446\): Count the lines of the shipped qfai-run/SKILL' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on its first run; already satisfied by the shipped `qfai-run/SKILL.md`, then 149 lines. It stays at 150 lines after the request-kind guidance of TDD-0356 was added
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/skillAssets.test.ts > TC-0018-0229 (TDD-0446): Count the lines of the shipped qfai-run/SKILL`
- Production files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-run/SKILL.md`

### TDD-0465

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/startCreatesTheRunAndNothingElse.test.ts`
- Selector: `TC-0018-0238 (TDD-0465): a start input carrying scope is refused schema`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/startCreatesTheRunAndNothingElse.test.ts --testNamePattern='TC-0018-0238 \(TDD-0465\): a start input carrying scope is refused schema' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { Object (run, code, ...) } to deeply equal { run: null, …(3) }` at `tests/unit/workflow/startCreatesTheRunAndNothingElse.test.ts:51:6`: `start` created the run and ignored `scope`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/startCreatesTheRunAndNothingElse.test.ts > TC-0018-0238 (TDD-0465): a start input carrying scope is refused schema`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0466

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/debtBlocksCompletion.test.ts`
- Selector: `TC-0018-0239 (TDD-0466): finish-validate`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/debtBlocksCompletion.test.ts --testNamePattern='TC-0018-0239 \(TDD-0466\): finish-validate' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0055: `finish` counts a debt only while its validate reports the finding code at the debt's path, whichever spec owns it.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/debtBlocksCompletion.test.ts > TC-0018-0239 (TDD-0466): finish-validate`
- Production files: none

### TDD-0467

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/debtBlocksCompletion.test.ts`
- Selector: `TC-0018-0239 (TDD-0467): later-result`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/debtBlocksCompletion.test.ts --testNamePattern='TC-0018-0239 \(TDD-0467\): later-result' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'ready', unmet: [ { …(3) } ] } to deeply equal { state: 'completed', unmet: [] }` at `tests/unit/workflow/debtBlocksCompletion.test.ts:195:69`: `finish` listed `debt-open` for the debt a later accepted implement result no longer reported
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/debtBlocksCompletion.test.ts > TC-0018-0239 (TDD-0467): later-result`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0468

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/debtBlocksCompletion.test.ts`
- Selector: `TC-0018-0240 (TDD-0468): still-reported`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/debtBlocksCompletion.test.ts --testNamePattern='TC-0018-0240 \(TDD-0468\): still-reported' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0055: a debt whose finding code the `finish` validate still reports at its path stays `debt-open` with its `resolvingOwner`.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/debtBlocksCompletion.test.ts > TC-0018-0240 (TDD-0468): still-reported`
- Production files: none

### TDD-0469

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/debtBlocksCompletion.test.ts`
- Selector: `TC-0018-0240 (TDD-0469): other-path`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/debtBlocksCompletion.test.ts --testNamePattern='TC-0018-0240 \(TDD-0469\): other-path' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0055: the debt matches a finding by code and path together, so the same code at another path does not keep it open.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/debtBlocksCompletion.test.ts > TC-0018-0240 (TDD-0469): other-path`
- Production files: none

### TDD-0470

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aDiscussionUnderARunAsksOnlyWhatIsOpen.test.ts`
- Selector: `TC-0018-0241 (TDD-0470): settled names the routing result and the answered question`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aDiscussionUnderARunAsksOnlyWhatIsOpen.test.ts --testNamePattern='TC-0018-0241 \(TDD-0470\): settled names the routing result and the answered question' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected undefined to deeply equal { …(2) }`, `tests/unit/workflow/aDiscussionUnderARunAsksOnlyWhatIsOpen.test.ts:106`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aDiscussionUnderARunAsksOnlyWhatIsOpen.test.ts > TC-0018-0241 (TDD-0470): settled names the routing result and the answered question`
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Design choice (settled between agents): `settled` reaches `next` through one snapshot field, `settled`, and one runtime-only payload. The routing-accept event (`plan-accepted` or `unsettled-material-input`) carries `settled` with the accepted routing result's ID, and each `authorization-recorded` event carries `settled` with the answered question added as `{ questionId, text, chosen }`, `chosen` the chosen option labels or the NFC-trimmed value. The run's settled facts are the last event that carries them, and `next` copies the snapshot's `settled` into the work order. The payload rides on events the contract already lists rather than on a new event type: CLI-WF `## State machine` enumerates the journal's events, and the edge-table rows (TDD-0164, TDD-0165, TDD-0175, TDD-0176) and the effect rows (TDD-0120 to TDD-0123) pin each operation's event list, so a new event type would have contradicted the contract and moved those closed rows. The free-text value stays out of the tracked authorization record, which still keeps only its keyed digest.

### TDD-0479

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts`
- Selector: `TC-0018-0246 (TDD-0479): own ledger and evidence accepted`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts --testNamePattern='TC-0018-0246 \(TDD-0479\): own ledger and evidence accepted' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { recordAreas: undefined, …(2) } to deeply equal { recordAreas: [ …(2) ], …(2) }` at `tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts:80:70`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts > TC-0018-0246 (TDD-0479): own ledger and evidence accepted`
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- SIMPLIFIED: `recordAreasOf` names the bound spec's records under the default specs directory, `.qfai/specs`. Lift when: the command adapter supplies the configured specs directory.

### TDD-0480

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts`
- Selector: `TC-0018-0247 (TDD-0480): another spec's evidence refused write-scope`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts --testNamePattern='TC-0018-0247 \(TDD-0480\): another spec's evidence refused write-scope' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0074 and TDD-0479: the write-scope check refuses a changed file outside `scope.writeAreas` and `recordAreas`, and the implement work order's `recordAreas` name only spec-0001's ledger and implement evidence.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts > TC-0018-0247 (TDD-0480): another spec's evidence refused write-scope`
- Production files: none

### TDD-0481

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts`
- Selector: `TC-0018-0248 (TDD-0481): a change-request record refused write-scope`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts --testNamePattern='TC-0018-0248 \(TDD-0481\): a change-request record refused write-scope' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0074 and TDD-0479: the write-scope check refuses a changed file outside `scope.writeAreas` and `recordAreas`, and the implement work order's `recordAreas` name only spec-0001's ledger and implement evidence.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts > TC-0018-0248 (TDD-0481): a change-request record refused write-scope`
- Production files: none

### TDD-0482

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts`
- Selector: `TC-0018-0249 (TDD-0482): decision-record`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts --testNamePattern='TC-0018-0249 \(TDD-0482\): decision-record' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0074 and TDD-0479: the write-scope check refuses a changed file outside `scope.writeAreas` and `recordAreas`, and the implement work order's `recordAreas` name only spec-0001's ledger and implement evidence.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts > TC-0018-0249 (TDD-0482): decision-record`
- Production files: none

### TDD-0483

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts`
- Selector: `TC-0018-0249 (TDD-0483): workflow-evidence`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts --testNamePattern='TC-0018-0249 \(TDD-0483\): workflow-evidence' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0074 and TDD-0479: the write-scope check refuses a changed file outside `scope.writeAreas` and `recordAreas`, and the implement work order's `recordAreas` name only spec-0001's ledger and implement evidence.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts > TC-0018-0249 (TDD-0483): workflow-evidence`
- Production files: none

### TDD-0484

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts`
- Selector: `TC-0018-0249 (TDD-0484): acceptance-criteria`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts --testNamePattern='TC-0018-0249 \(TDD-0484\): acceptance-criteria' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0074: the `sdd_append` work order's areas do not hold the bound spec's `03_Acceptance-Criteria.md`, so the write-scope check refuses it.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts > TC-0018-0249 (TDD-0484): acceptance-criteria`
- Production files: none

### TDD-0485

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts`
- Selector: `TC-0018-0250 (TDD-0485): implement`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts --testNamePattern='TC-0018-0250 \(TDD-0485\): implement' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0479, which derives the implement records.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts > TC-0018-0250 (TDD-0485): implement`
- Production files: none

### TDD-0486

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts`
- Selector: `TC-0018-0250 (TDD-0486): regression-fix`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts --testNamePattern='TC-0018-0250 \(TDD-0486\): regression-fix' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected undefined to deeply equal [ …(2) ]` at `tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts:191:57`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts > TC-0018-0250 (TDD-0486): regression-fix`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0487

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts`
- Selector: `TC-0018-0250 (TDD-0487): test-fix-implement`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts --testNamePattern='TC-0018-0250 \(TDD-0487\): test-fix-implement' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected undefined to deeply equal [ …(2) ]` at `tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts:191:57`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts > TC-0018-0250 (TDD-0487): test-fix-implement`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0488

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts`
- Selector: `TC-0018-0250 (TDD-0488): acceptance`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts --testNamePattern='TC-0018-0250 \(TDD-0488\): acceptance' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected undefined to deeply equal [ …(3) ]` at `tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts:191:57`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts > TC-0018-0250 (TDD-0488): acceptance`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0489

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts`
- Selector: `TC-0018-0250 (TDD-0489): test-fix-atdd`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts --testNamePattern='TC-0018-0250 \(TDD-0489\): test-fix-atdd' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected undefined to deeply equal [ …(3) ]` at `tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts:191:57`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts > TC-0018-0250 (TDD-0489): test-fix-atdd`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0490

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts`
- Selector: `TC-0018-0250 (TDD-0490): sdd-append`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts --testNamePattern='TC-0018-0250 \(TDD-0490\): sdd-append' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected undefined to deeply equal [ …(4) ]` at `tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts:191:57`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts > TC-0018-0250 (TDD-0490): sdd-append`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0491

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts`
- Selector: `TC-0018-0250 (TDD-0491): prototype-not-ui-bearing`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts --testNamePattern='TC-0018-0250 \(TDD-0491\): prototype-not-ui-bearing' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0479: only the kinds the contract lists get record areas, and a prototype on a target that is not UI-bearing is not one of them.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts > TC-0018-0250 (TDD-0491): prototype-not-ui-bearing`
- Production files: `packages/qfai/src/core/workflow/decide.ts` (the marker only)
- SIMPLIFIED: a prototype work order names no record, which is the contract's answer for a target that is not UI-bearing. Lift when: the facts say whether a prototype's target is UI-bearing, and the UI-bearing case gets `.qfai/evidence/prototyping/grilling.md`.

### TDD-0492

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts`
- Selector: `TC-0018-0250 (TDD-0492): sdd`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts --testNamePattern='TC-0018-0250 \(TDD-0492\): sdd' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0479: only the kinds the contract lists get record areas, so an `sdd` work order carries none.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts > TC-0018-0250 (TDD-0492): sdd`
- Production files: none

### TDD-0493

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts`
- Selector: `TC-0018-0250 (TDD-0493): sdd-delta`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts --testNamePattern='TC-0018-0250 \(TDD-0493\): sdd-delta' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0479: only the kinds the contract lists get record areas, so an `sdd_delta` work order carries none.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts > TC-0018-0250 (TDD-0493): sdd-delta`
- Production files: none

### TDD-0494

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts`
- Selector: `TC-0018-0250 (TDD-0494): discussion`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts --testNamePattern='TC-0018-0250 \(TDD-0494\): discussion' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0479: only the kinds the contract lists get record areas, so a `discussion` work order carries none.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts > TC-0018-0250 (TDD-0494): discussion`
- Production files: none

### TDD-0495

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts`
- Selector: `TC-0018-0250 (TDD-0495): verify`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts --testNamePattern='TC-0018-0250 \(TDD-0495\): verify' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0479: only the kinds the contract lists get record areas, so a `verify` work order carries none.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts > TC-0018-0250 (TDD-0495): verify`
- Production files: none

### TDD-0496

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts`
- Selector: `TC-0018-0250 (TDD-0496): diagnose`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts --testNamePattern='TC-0018-0250 \(TDD-0496\): diagnose' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0479: only the kinds the contract lists get record areas, so a `diagnose` work order carries none.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts > TC-0018-0250 (TDD-0496): diagnose`
- Production files: none

### TDD-0497

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts`
- Selector: `TC-0018-0250 (TDD-0497): maintenance`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts --testNamePattern='TC-0018-0250 \(TDD-0497\): maintenance' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0479: only the kinds the contract lists get record areas, so a `maintenance` work order carries none.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts > TC-0018-0250 (TDD-0497): maintenance`
- Production files: none

### TDD-0498

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts`
- Selector: `TC-0018-0250 (TDD-0498): route`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts --testNamePattern='TC-0018-0250 \(TDD-0498\): route' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0479: only the kinds the contract lists get record areas, so a `route` work order carries none.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts > TC-0018-0250 (TDD-0498): route`
- Production files: none

### TDD-0499

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts`
- Selector: `TC-0018-0251 (TDD-0499): scope digest leaves recordAreas out`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts --testNamePattern='TC-0018-0251 \(TDD-0499\): scope digest leaves recordAreas out' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { recordAreasDiffer: true, …(2) } to deeply equal { recordAreasDiffer: true, …(2) }` (`digests[0]` received `undefined`), `tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts:249`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/aStageWritesOnlyItsOwnRecords.test.ts > TC-0018-0251 (TDD-0499): scope digest leaves recordAreas out`
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Design choice (settled between agents): CLI-WF `### Work order` says `scope.digest` covers `scope` only and CLI-WFFILE names no further inputs, so the digest is the SHA-256, the helper the ledger row-set digest already uses, of the JSON of the other four scope fields in a fixed order: `writeAreas`, `protectedTargets`, `allowedEffects`, `nonGoals`. The scope's `SIMPLIFIED` marker now names only what is still missing: the plan carries no protected targets and nothing supplies non-goals, so the digest reads each as empty until the checked plan keeps them.

### TDD-0502

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/integration/workflow/skillAssets.test.ts`
- Selector: `TC-0018-0254 (TDD-0502): the per-kind write-scope list in the routing reference`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/skillAssets.test.ts --testNamePattern='TC-0018-0254 \(TDD-0502\): the per-kind write-scope list in the routing reference' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `→ expected { …(2) } to deeply equal { perKind: [ true, true, …(2) ], …(1) }`, `tests/integration/workflow/skillAssets.test.ts:214`; the routing reference had no per-kind list and named five of the seven protected paths
- GREEN result: exit 0; `✓ |integration| tests/integration/workflow/skillAssets.test.ts > TC-0018-0254 (TDD-0502): the per-kind write-scope list in the routing reference`
- Production files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-run/references/payloads.md`

### TDD-0503

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theProposalNamesEachTrackedStageRecord.test.ts`
- Selector: `TC-0018-0255 (TDD-0503): decisions-cr`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theProposalNamesEachTrackedStageRecord.test.ts --testNamePattern='TC-0018-0255 \(TDD-0503\): decisions-cr' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0019: `.qfai/decisions/` is one of the core's protected prefixes, so the proposal naming it is refused `protected-surface` and the run stays `routing` with no event.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/theProposalNamesEachTrackedStageRecord.test.ts > TC-0018-0255 (TDD-0503): decisions-cr`
- Production files: none

### TDD-0504

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theProposalNamesEachTrackedStageRecord.test.ts`
- Selector: `TC-0018-0255 (TDD-0504): evidence-decisions`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theProposalNamesEachTrackedStageRecord.test.ts --testNamePattern='TC-0018-0255 \(TDD-0504\): evidence-decisions' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0019: `.qfai/evidence/decisions/` is one of the core's protected prefixes, so the proposal naming it is refused `protected-surface` and the run stays `routing` with no event.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/theProposalNamesEachTrackedStageRecord.test.ts > TC-0018-0255 (TDD-0504): evidence-decisions`
- Production files: none

### TDD-0505

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theProposalNamesEachTrackedStageRecord.test.ts`
- Selector: `TC-0018-0255 (TDD-0505): change-request`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theProposalNamesEachTrackedStageRecord.test.ts --testNamePattern='TC-0018-0255 \(TDD-0505\): change-request' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0019: `.qfai/evidence/change-request-` is one of the core's protected prefixes, so the proposal naming it is refused `protected-surface` and the run stays `routing` with no event.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/theProposalNamesEachTrackedStageRecord.test.ts > TC-0018-0255 (TDD-0505): change-request`
- Production files: none

### TDD-0506

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theProposalNamesEachTrackedStageRecord.test.ts`
- Selector: `TC-0018-0255 (TDD-0506): decision-record`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theProposalNamesEachTrackedStageRecord.test.ts --testNamePattern='TC-0018-0255 \(TDD-0506\): decision-record' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0019: `.qfai/evidence/decision-` is one of the core's protected prefixes, so the proposal naming it is refused `protected-surface` and the run stays `routing` with no event.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/theProposalNamesEachTrackedStageRecord.test.ts > TC-0018-0255 (TDD-0506): decision-record`
- Production files: none

### TDD-0507

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/upstreamDriftInsideARun.test.ts`
- Selector: `TC-0018-0256 (TDD-0507): blocked debts outside the scope name scope-dependency and every finding`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/upstreamDriftInsideARun.test.ts --testNamePattern='TC-0018-0256 \(TDD-0507\): blocked debts outside the scope name scope-dependency and every finding' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected [ { state: 'blocked', …(3) }, …(1) ] to deeply equal [ { state: 'blocked', …(3) }, …(1) ]` (`halt` received `undefined`), `tests/unit/workflow/upstreamDriftInsideARun.test.ts:115`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/upstreamDriftInsideARun.test.ts > TC-0018-0256 (TDD-0507): blocked debts outside the scope name scope-dependency and every finding`
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Design choice: the blocker's subjects name each listed finding as `<findingCode>@<path>`, the form the repair budget already uses for a cause. The `blockOnResult` `SIMPLIFIED` marker now covers an `unrun` result only, since a `blocked` result's blocker and owner are derived from its debts; the contract names no blocker for `unrun`.

### TDD-0508

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/upstreamDriftInsideARun.test.ts`
- Selector: `TC-0018-0257 (TDD-0508): drift inside the checked scope goes to qfai-sdd`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/upstreamDriftInsideARun.test.ts --testNamePattern='TC-0018-0257 \(TDD-0508\): drift inside the checked scope goes to qfai-sdd' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0101: a `needs_repair` result's finding goes to the plan stage its `resolvingOwner` serves, here the `qfai-sdd` stage.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/upstreamDriftInsideARun.test.ts > TC-0018-0257 (TDD-0508): drift inside the checked scope goes to qfai-sdd`
- Production files: none

### TDD-0509

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/upstreamDriftInsideARun.test.ts`
- Selector: `TC-0018-0258 (TDD-0509): a CR under .qfai/decisions refused write-scope`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/upstreamDriftInsideARun.test.ts --testNamePattern='TC-0018-0258 \(TDD-0509\): a CR under \.qfai/decisions refused write-scope' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0074: a changed file in neither `scope.writeAreas` nor `recordAreas` is refused `write-scope`, and no record area names `.qfai/decisions/`.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/upstreamDriftInsideARun.test.ts > TC-0018-0258 (TDD-0509): a CR under .qfai/decisions refused write-scope`
- Production files: none

### TDD-0510

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/upstreamDriftInsideARun.test.ts`
- Selector: `TC-0018-0259 (TDD-0510): in-scope-skill-owner`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/upstreamDriftInsideARun.test.ts --testNamePattern='TC-0018-0259 \(TDD-0510\): in-scope-skill-owner' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'blocked', …(3) } to deeply equal { state: 'running', …(3) }`, `tests/unit/workflow/upstreamDriftInsideARun.test.ts:176`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/upstreamDriftInsideARun.test.ts > TC-0018-0259 (TDD-0510): in-scope-skill-owner`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0511

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/upstreamDriftInsideARun.test.ts`
- Selector: `TC-0018-0259 (TDD-0511): owning-spec-unknown`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/upstreamDriftInsideARun.test.ts --testNamePattern='TC-0018-0259 \(TDD-0511\): owning-spec-unknown' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'blocked', …(3) } to deeply equal { state: 'running', …(3) }`, `tests/unit/workflow/upstreamDriftInsideARun.test.ts:176`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/upstreamDriftInsideARun.test.ts > TC-0018-0259 (TDD-0511): owning-spec-unknown`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0512

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/upstreamDriftInsideARun.test.ts`
- Selector: `TC-0018-0259 (TDD-0512): owning-spec-false`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/upstreamDriftInsideARun.test.ts --testNamePattern='TC-0018-0259 \(TDD-0512\): owning-spec-false' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'blocked', …(3) } to deeply equal { state: 'running', …(3) }`, `tests/unit/workflow/upstreamDriftInsideARun.test.ts:176`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/upstreamDriftInsideARun.test.ts > TC-0018-0259 (TDD-0512): owning-spec-false`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0513

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/upstreamDriftInsideARun.test.ts`
- Selector: `TC-0018-0260 (TDD-0513): still-blocked`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/upstreamDriftInsideARun.test.ts --testNamePattern='TC-0018-0260 \(TDD-0513\): still-blocked' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { …(4) } to deeply equal { …(4) }` (`blocker` received `undefined`), `tests/unit/workflow/upstreamDriftInsideARun.test.ts:207`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/upstreamDriftInsideARun.test.ts > TC-0018-0260 (TDD-0513): still-blocked`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0514

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/upstreamDriftInsideARun.test.ts`
- Selector: `TC-0018-0260 (TDD-0514): cleared`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/upstreamDriftInsideARun.test.ts --testNamePattern='TC-0018-0260 \(TDD-0514\): cleared' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0177: `resume` of a blocked run reissues the stage's work order as a new attempt, and an accepted result moves the run to `ready`.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/upstreamDriftInsideARun.test.ts > TC-0018-0260 (TDD-0514): cleared`
- Production files: none

### TDD-0515

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/upstreamDriftInsideARun.test.ts`
- Selector: `TC-0018-0261 (TDD-0515): delegation-unavailable comes before listed debts`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/upstreamDriftInsideARun.test.ts --testNamePattern='TC-0018-0261 \(TDD-0515\): delegation-unavailable comes before listed debts' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0206: the delegation decision runs before anything the result lists, so an unavailable delegation after the first names `delegation-unavailable`.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/upstreamDriftInsideARun.test.ts > TC-0018-0261 (TDD-0515): delegation-unavailable comes before listed debts`
- Production files: none

### TDD-0516

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/runChangeBoundary.test.ts`
- Selector: `TC-0018-0262 (TDD-0516): issued stage recordAreas pass later write and finish`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/runChangeBoundary.test.ts --testNamePattern='TC-0018-0262 \(TDD-0516\): issued stage recordAreas pass later write and finish' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { next: 'invariant-violation', …(1) } to deeply equal { next: undefined, outOfScope: [] }`, `tests/unit/workflow/runChangeBoundary.test.ts:37`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/runChangeBoundary.test.ts > TC-0018-0262 (TDD-0516): issued stage recordAreas pass later write and finish`
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Design choice (settled between agents): the authorized set of CLI-WF `## Run change boundary` is the plan's write scope, which every issued work order carries as `scope.writeAreas`, with the record areas of every work order the run issued, the core's `.qfai/evidence/workflow/<runId>/` tree, and each start adjustment that still holds. The snapshot carries the issued record areas as `issuedRecordAreas`, beside the outstanding work order's own. Both the write-operation check and `finish` read the same set. The authorized-set `SIMPLIFIED` marker on `escapedPaths` is removed: its lifting condition, a snapshot recording every issued work order's record areas, now holds.

### TDD-0517

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/runChangeBoundary.test.ts`
- Selector: `TC-0018-0263 (TDD-0517): core evidence passes later write and finish`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/runChangeBoundary.test.ts --testNamePattern='TC-0018-0263 \(TDD-0517\): core evidence passes later write and finish' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0044, which put `.qfai/evidence/workflow/<runId>/` in the authorized set, and TDD-0483, which refuses a stage result listing it `write-scope`.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/runChangeBoundary.test.ts > TC-0018-0263 (TDD-0517): core evidence passes later write and finish`
- Production files: none

### TDD-0518

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/runChangeBoundary.test.ts`
- Selector: `TC-0018-0264 (TDD-0518): approved named external repair passes resume and finish`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/runChangeBoundary.test.ts --testNamePattern='TC-0018-0264 \(TDD-0518\): approved named external repair passes resume and finish' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { …(2) } to deeply equal { resumed: { …(3) }, checks: { …(2) } }`, `tests/unit/workflow/runChangeBoundary.test.ts:136`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/runChangeBoundary.test.ts > TC-0018-0264 (TDD-0518): approved named external repair passes resume and finish`
- Production files: `packages/qfai/src/core/workflow/decide.ts`
- Design choice (settled between agents): `resume` of a run blocked on `scope-dependency` admits a change outside the boundary only when an approved Change Request authorizes a path the blocker's findings name. It then admits that Change Request's record and those named paths, each at its current digest, and nothing else. Observers supply each Change Request as `{ recordPath, approved, paths }` in the facts. The admitted paths travel on the `blocker-cleared-and-revalidated` event as `adjustments`, `{ path, digest, changeRequest }` each, and the snapshot keeps them as `startAdjustments`. The snapshot also keeps the blocked run's `halt`, whose `<findingCode>@<path>` subjects name the findings. An adjustment holds at every later write operation and at `finish` only while its Change Request is still approved and its path keeps the admitted digest. Otherwise the path is outside the boundary again: a write operation is refused `fail-closed` with cause `invariant-violation`, and `finish` lists it `diff-out-of-scope`. A `resume` that finds any change no approved repair admits is refused `fail-closed` with cause `invariant-violation`, and the run stays `blocked`.

### TDD-0519

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/runChangeBoundary.test.ts`
- Selector: `TC-0018-0264 (TDD-0519): missing approval fails closed`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/runChangeBoundary.test.ts --testNamePattern='TC-0018-0264 \(TDD-0519\): missing approval fails closed' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'ready', …(2) } to deeply equal { state: 'blocked', …(2) }`, `tests/unit/workflow/runChangeBoundary.test.ts:145`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/runChangeBoundary.test.ts > TC-0018-0264 (TDD-0519): missing approval fails closed`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0520

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/runChangeBoundary.test.ts`
- Selector: `TC-0018-0264 (TDD-0520): unlisted external path fails closed`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/runChangeBoundary.test.ts --testNamePattern='TC-0018-0264 \(TDD-0520\): unlisted external path fails closed' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { state: 'ready', …(2) } to deeply equal { state: 'blocked', …(2) }`, `tests/unit/workflow/runChangeBoundary.test.ts:153`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/runChangeBoundary.test.ts > TC-0018-0264 (TDD-0520): unlisted external path fails closed`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0521

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/runChangeBoundary.test.ts`
- Selector: `TC-0018-0264 (TDD-0521): digest drift fails closed`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/runChangeBoundary.test.ts --testNamePattern='TC-0018-0264 \(TDD-0521\): digest drift fails closed' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `AssertionError: expected { next: 'invariant-violation', …(1) } to deeply equal { next: 'invariant-violation', …(1) }` (`outOfScope` also named the Change Request record), `tests/unit/workflow/runChangeBoundary.test.ts:161`
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/runChangeBoundary.test.ts > TC-0018-0264 (TDD-0521): digest drift fails closed`
- Production files: `packages/qfai/src/core/workflow/decide.ts`

### TDD-0522

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/commitBeforeCompletion.test.ts`
- Selector: `TC-0018-0265 (TDD-0522): uncommitted tracked stage change`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/commitBeforeCompletion.test.ts --testNamePattern='TC-0018-0265 \(TDD-0522\): uncommitted tracked stage change' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0054: on a `qfai_done` run every uncommitted path the completion facts report is an `uncommitted` unmet condition, so `finish` keeps the run `ready` and records no event.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/commitBeforeCompletion.test.ts > TC-0018-0265 (TDD-0522): uncommitted tracked stage change`
- Production files: none

### TDD-0523

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/commitBeforeCompletion.test.ts`
- Selector: `TC-0018-0265 (TDD-0523): uncommitted tracked summary`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/commitBeforeCompletion.test.ts --testNamePattern='TC-0018-0265 \(TDD-0523\): uncommitted tracked summary' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0054: on a `qfai_done` run every uncommitted path the completion facts report is an `uncommitted` unmet condition, so `finish` keeps the run `ready` and records no event.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/commitBeforeCompletion.test.ts > TC-0018-0265 (TDD-0523): uncommitted tracked summary`
- Production files: none

### TDD-0524

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/commitBeforeCompletion.test.ts`
- Selector: `TC-0018-0265 (TDD-0524): uncommitted authorization file`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/commitBeforeCompletion.test.ts --testNamePattern='TC-0018-0265 \(TDD-0524\): uncommitted authorization file' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0054: on a `qfai_done` run every uncommitted path the completion facts report is an `uncommitted` unmet condition, so `finish` keeps the run `ready` and records no event.
- GREEN result: exit 0; `✓ |unit| tests/unit/workflow/commitBeforeCompletion.test.ts > TC-0018-0265 (TDD-0524): uncommitted authorization file`
- Production files: none

### TDD-0527

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts`
- Selector: `TC-0018-0268 (TDD-0527): missing persisted CREATE authorization at SDD issue`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts --testNamePattern='TC-0018-0268 \(TDD-0527\): missing persisted CREATE authorization at SDD issue' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/theAnswerIsABoundHumanDecision.test.ts:190:18` — the run went to `running` with an SDD work order carrying `authorizationRefs: []` and one `work-order-issued` event, where `awaiting_input` with one `create` question for `slot-3-1` was expected.
- GREEN result: exit 0; `✓ ... TC-0018-0268 (TDD-0527): missing persisted CREATE authorization at SDD issue`, 1 passed, 1 skipped.
- Production files: `packages/qfai/src/core/workflow/decide.ts` (`next` opens a new `create` question for the approval's slot and moves `ready` to `awaiting_input` when the CREATE approval has no `authorizationId`; the question builder is shared with routing).

### TDD-0528

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/routeProposalReferenceShape.test.ts`
- Selector: `TC-0018-0269 (TDD-0528): bare string in expectedBehaviorRefs`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/routeProposalReferenceShape.test.ts --testNamePattern='TC-0018-0269 \(TDD-0528\): bare string in expectedBehaviorRefs' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1; `expect(actual).toEqual(expected)` at `tests/unit/workflow/routeProposalReferenceShape.test.ts:72:18` — the stub parser accepted the bare string, `error` was `null` and the proposal reached `decide`, which returned events.
- GREEN result: exit 0; `✓ ... TC-0018-0269 (TDD-0528): bare string in expectedBehaviorRefs`, 1 passed.
- Production files: `packages/qfai/src/core/workflow/parse.ts` (`parseRouteReferences` requires exact `{ kind, ref }` entries of the closed kinds each array allows, and refuses anything else `invalid-input` / `schema` naming the entry, before `decide` runs).

### TDD-0529

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Test file: `packages/qfai/tests/unit/workflow/routeProposalReferenceShape.test.ts`
- Selector: `TC-0018-0269 (TDD-0529): bare string in observedRefs`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/unit/workflow/routeProposalReferenceShape.test.ts --testNamePattern='TC-0018-0269 \(TDD-0529\): bare string in observedRefs' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on first run; already satisfied by TDD-0528, whose parser checks both arrays with one entry check.
- GREEN result: exit 0; `✓ ... TC-0018-0269 (TDD-0529): bare string in observedRefs`, 1 passed, 1 skipped.
- Production files: `packages/qfai/src/core/workflow/parse.ts` (no change beyond TDD-0528).

## Record defects

- Repaired — `record:ROUND-EVIDENCE`, TDD-0003: Round 1 phase evidence records its RED, GREEN, oracle and review fields without `Round 1:` or a `#### Round 1` block, although that was the single cycle observed. The Round 1 implementation review reported this advisory. Existing values were moved into Round 1 before opening Round 2; the sealed Round 1 review pack is preserved.
- Repaired — `record:ROUND-EVIDENCE`, TDD-0028: `Round 1: Revision` sat with the RED record, above the RED fields, and held the RED tree's address. `Revision` names the GREEN tree and is outside the RED subject. The line now sits below the RED record and holds the GREEN address. `Round 1: RED revision` still holds the RED address, unchanged.

## Test results summary

TDD-0001's RED selector failed on the expected `awaiting_input` and CREATE-question predicate. With only its assertion neutralized, the same selector passed. Its first review attempt returned REVISE on the Plan's missing architecture exception; the approved Plan correction, second reviews and checkpoint passed. TDD-0002's RED failed on final-stage reachability; its GREEN reached `verify` without another CREATE question. A temporary extra CREATE question made TDD-0002 fail, and the original TDD-0001 mutation still made the shared test fail. Both mutations were restored; the two-test refactor suite passed.

## Exception items

None.

## Cross-spec obligations

None. Before considering a source or test edit, all 18 other specs' ledgers were scanned for `done` rows naming either file by repository path or dotted module alias; direct matches: 0. The reverse dependency scan found only this row's test importing `decide.ts`, no production importer, and no importer of the test file. No other spec's completed selector is reached by either file.

## Commands executed

| Command | Result |
| ------- | ------ |
| `node node_modules/vitest/vitest.mjs run tests/unit/workflow/oneCreateQuestionAtRouting.test.ts --reporter=verbose` from `packages/qfai` | RED exit 1; one assertion failure at line 89 |
| `node tmp/revision-tdd0001.mjs` from repository root, twice | Both exit 0 and report `working-tree+b10641cd1611e7d900e75192ec99f942671648b597a9fd5c320fe06349338b67`; 2,494 path records |
| `git diff --no-index -- tmp/tdd0001-strip/original.test.ts packages/qfai/tests/unit/workflow/oneCreateQuestionAtRouting.test.ts` | Exit 1 because the intentional one-line assertion strip differed; diff captured above |
| Same Vitest command with the assertion neutralized | Exit 0; one selected test passed |
| `Get-FileHash -Algorithm SHA256` for the test and seam | File digests recorded in Round 1; restored test digest matched |
| GREEN Vitest command from `packages/qfai` | Exit 0; one selected test passed |
| Same Vitest command with returned state changed to `routing` | Exit 1; state assertion at line 89 failed |
| Same Vitest command after restoring the source | Exit 0; one selected test passed |
| `node tmp/revision-tdd0001-green.mjs` from repository root, twice | Both exit 0 and report `working-tree+7d838c868b8b5e07c264bc62ca5ae61447c6c1546c04aef9ce8e8a6ddc5bfea8`; 2,494 path records |
| Direct `tsc --noEmit`, Prettier check and ESLint on the changed source | Exit 0 after source formatting and one unnecessary optional chain was removed |
| `rg --files .qfai/specs -g test-list.md` plus `Select-String` on other specs' `done` rows | 18 other ledgers, 0 direct matches for either file or dotted alias |
| `rg -l 'workflow/decide\|oneCreateQuestionAtRouting\|core\.workflow\.decide' packages/qfai/src packages/qfai/tests` | Only this row's test imports the new source; no other importer found |
| Refactor verify Vitest command from `packages/qfai` | Exit 0; one selected test passed |
| `node tmp/revision-tdd0001-refactor.mjs` from repository root, twice | Both exit 0 and report `working-tree+7d838c868b8b5e07c264bc62ca5ae61447c6c1546c04aef9ce8e8a6ddc5bfea8`; 2,494 path records |
| Refactor verify Vitest command after `CR-20260924-0001` from `packages/qfai` | Exit 0; one selected test passed |
| `node tmp/revision-tdd0001-after-cr.mjs` from repository root, twice | Both exit 0 and report `working-tree+f6cd0be7eecbfe928f840cabe5a6da3f9c7dbe20cdea8f673111d9927d7649d8`; 2,495 path records; temporary helper removed |
