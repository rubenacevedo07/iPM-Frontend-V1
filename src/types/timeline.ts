// src/types/timeline.ts

export interface TimelineEntityDto {
  entityId:    number;
  entityType:  string | null;
  entityLabel: string | null;
  isPrimary:   boolean;
}

export interface TimelineFeedItemDto {
  id:                  string;            // uuid
  name:                string | null;
  description:         string | null;
  status:              string | null;     // Draft | Open | Resolved | Expired | Archived
  divergenceType:      string | null;
  divergenceName:      string | null;
  startDate:           string;            // date
  resolutionDate:      string | null;     // date
  isFeatured:          boolean;
  viewCount:           number;
  betCount:            number;
  commentCount:        number;
  createdAt:           string;            // date-time
  authorId:            string;            // uuid
  authorUsername:      string | null;
  authorDisplayName:   string | null;
  authorAnalystScore:  number;
  branchAId:           string | null;
  branchAName:         string | null;
  branchAProb:         number | null;
  branchAPoints:       number | null;
  branchBId:           string | null;
  branchBName:         string | null;
  branchBProb:         number | null;
  branchBPoints:       number | null;
  entities:            TimelineEntityDto[] | null;
  polymarketConditionId: string | null;
}

export interface TimelineCommentDto {
  id:                 string;   // uuid
  timelineId:         string;
  branchId:           string | null;
  branchLabel:        string | null;
  body:               string | null;
  upvoteCount:        number;
  createdAt:          string;
  parentId:           string | null;
  authorId:           string;
  authorUsername:     string | null;
  authorDisplayName:  string | null;
  authorAvatarUrl:    string | null;
  authorAnalystScore: number;
}

export interface PostBetRequest {
  userId:       string;   // uuid
  branchId:     string;   // uuid
  pointsStaked: number;
  confidence:   number;   // 0.0 – 1.0
}
