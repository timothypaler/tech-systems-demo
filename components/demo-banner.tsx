import { FlaskConical } from "lucide-react";

export function DemoBanner(){
  return <div className="demo-environment-badge" role="status"><FlaskConical/><span><strong>Demo mode</strong>No real charges or messages</span></div>;
}
