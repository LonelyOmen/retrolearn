import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserPlus } from 'lucide-react'
import { useWorkRooms } from '@/hooks/useWorkRooms'

interface JoinRoomDialogProps {
  onRoomJoined?: () => void
}

export function JoinRoomDialog({ onRoomJoined }: JoinRoomDialogProps) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const { joinRoom } = useWorkRooms()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!code.trim()) return

    setIsJoining(true)
    const room = await joinRoom(code.trim())
    
    if (room) {
      setOpen(false)
      setCode('')
      onRoomJoined?.()
    }
    
    setIsJoining(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isJoining) {
      setOpen(newOpen)
      if (!newOpen) {
        setCode('')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Join Room
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Join Work Room</DialogTitle>
            <DialogDescription>
              Enter the room code to join an existing work room.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="room-code">Room Code</Label>
              <Input
                id="room-code"
                placeholder="Enter 6-character code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                disabled={isJoining}
                maxLength={6}
                className="font-mono uppercase tracking-wider"
              />
              <p className="text-xs text-muted-foreground">
                Room codes are 6 characters long (e.g., ABC123)
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={isJoining}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isJoining || !code.trim()}>
              {isJoining ? "Joining..." : "Join Room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}