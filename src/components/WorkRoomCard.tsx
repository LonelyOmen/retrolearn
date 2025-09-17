import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, MessageSquare, ExternalLink, Copy, LogOut, Trash2 } from 'lucide-react'
import { useWorkRooms } from '@/hooks/useWorkRooms'
import { useToast } from '@/hooks/use-toast'
import { Database } from '@/integrations/supabase/types'

type WorkRoom = Database['public']['Tables']['work_rooms']['Row']

interface WorkRoomCardProps {
  room: WorkRoom
  onEnterRoom: (room: WorkRoom) => void
  isCreator: boolean
}

export function WorkRoomCard({ room, onEnterRoom, isCreator }: WorkRoomCardProps) {
  const { leaveRoom, deleteRoom } = useWorkRooms()
  const { toast } = useToast()
  const [isLeaving, setIsLeaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code)
    toast({
      title: "Code copied!",
      description: "Room code has been copied to clipboard",
    })
  }

  const handleLeaveRoom = async () => {
    if (isCreator) {
      toast({
        title: "Cannot leave",
        description: "Room creators cannot leave their own rooms",
        variant: "destructive",
      })
      return
    }

    setIsLeaving(true)
    await leaveRoom(room.id)
    setIsLeaving(false)
  }

  const handleDeleteRoom = async () => {
    if (!isCreator) return

    setIsDeleting(true)
    const success = await deleteRoom(room.id)
    if (!success) {
      setIsDeleting(false)
    }
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-border">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              {room.name}
            </CardTitle>
            {room.description && (
              <CardDescription className="text-sm text-muted-foreground line-clamp-2">
                {room.description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isCreator && <Badge variant="secondary" className="text-xs">Creator</Badge>}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyCode}
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>Members</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>Chat</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Code:</span>
              <Badge variant="outline" className="font-mono text-xs">
                {room.code}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => onEnterRoom(room)}
                size="sm"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Enter Room
              </Button>
              
              {!isCreator && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLeaveRoom}
                  disabled={isLeaving}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
              
              {isCreator && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteRoom}
                  disabled={isDeleting}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}