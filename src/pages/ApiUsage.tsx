import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApiUsage } from "@/hooks/useApiUsage";
import { Loader2, TrendingUp, Zap, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function ApiUsage() {
  const { usage, stats, loading } = useApiUsage();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            API Usage Monitor
          </h1>
          <p className="text-muted-foreground mt-2">
            Track which AI provider (OpenAI GPT-5 vs Gemini) is being used
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCalls}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.openaiCalls} OpenAI • {stats.geminiCalls} Gemini
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  API reliability
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageResponseTime}ms</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Average response time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fallback Rate</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.fallbackRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Used fallback API
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Usage Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent API Calls</CardTitle>
            <CardDescription>Last 100 API calls made across all functions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Function</th>
                    <th className="text-left py-3 px-4 font-medium">Provider</th>
                    <th className="text-left py-3 px-4 font-medium">Model</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Response Time</th>
                    <th className="text-left py-3 px-4 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{record.function_name}</span>
                          {record.is_fallback && (
                            <Badge variant="outline" className="text-xs">Fallback</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={record.api_provider === 'openai' ? 'default' : 'secondary'}>
                          {record.api_provider === 'openai' ? 'OpenAI' : 'Gemini'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {record.api_model}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={record.status === 'success' ? 'default' : 'destructive'}>
                          {record.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {record.response_time_ms ? `${record.response_time_ms}ms` : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {format(new Date(record.created_at), 'MMM d, HH:mm:ss')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {usage.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No API usage data yet. Start using AI features to see data here.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
