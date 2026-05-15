import { useAdminListUsers, useAdminGetStats } from "@/api/authHooks";
import { Layout } from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, BookOpen, Trash2, ShieldCheck, Mail } from "lucide-react";

export function Admin() {
  const { data: users, isLoading: usersLoading } = useAdminListUsers();
  const { data: stats, isLoading: statsLoading } = useAdminGetStats();

  if (usersLoading || statsLoading) {
    return (
      <Layout>
        <div className="p-8 space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            System overview and user management.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-card/50 border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalUsers || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" /> Total Knowledge Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalItems || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* User Table */}
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-card-border bg-muted/30">
            <h3 className="text-sm font-semibold">Registered Users</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/10 border-b border-card-border">
                <tr>
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Joined</th>
                  <th className="px-6 py-3 font-medium">Resources</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {users?.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">
                            {(user.name || user.email)[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.name || "Anonymous"}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.role === "admin" ? "default" : "outline"} className="capitalize">
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{user.stats.items}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
