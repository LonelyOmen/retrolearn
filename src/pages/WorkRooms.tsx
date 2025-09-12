import { useAuth } from '@/hooks/useAuth'
import { useWorkRooms } from '@/hooks/useWorkRooms'
import { WorkRoomCard } from '@/components/WorkRoomCard'
import { CreateRoomDialog } from '@/components/CreateRoomDialog'
import { JoinRoomDialog } from '@/components/JoinRoomDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Database } from '@/integrations/supabase/types'

type WorkRoom = Database['public']['Tables']['work_rooms']['Row']

export default function WorkRooms() {
  const { user } = useAuth()
  const { rooms, loading, refetch } = useWorkRooms()
  const navigate = useNavigate()

  const handleEnterRoom = (room: WorkRoom) => {
    navigate(`/workroom/${room.id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-8 w-48" />
          </div>
          
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-28" />
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Work Rooms</h1>
              <p className="text-sm text-muted-foreground">
                Collaborate and share notes with your team
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 mb-8">
          <CreateRoomDialog onRoomCreated={refetch} />
          <JoinRoomDialog onRoomJoined={refetch} />
        </div>

        {/* Rooms Grid */}
        {rooms.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 rounded-full bg-muted">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No work rooms yet
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first work room or join an existing one to start collaborating with your team.
            </p>
            <div className="flex items-center justify-center gap-4">
              <CreateRoomDialog onRoomCreated={refetch} />
              <JoinRoomDialog onRoomJoined={refetch} />
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <WorkRoomCard
                key={room.id}
                room={room}
                onEnterRoom={handleEnterRoom}
                isCreator={room.creator_id === user?.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}