export interface Resource {
  id: string
  name: string
  type: string
  location: string
  capacity: number | null
  approvalRequired?: boolean
  rules: string[]
}
