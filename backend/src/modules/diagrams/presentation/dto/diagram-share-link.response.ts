export interface DiagramShareLinkResponse {
  id: string;
  diagramId: string;
  token?: string;
  url?: string;
  revokedAt: string | null;
  createdAt: string;
}
