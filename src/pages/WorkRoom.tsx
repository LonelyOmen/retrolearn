import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useWorkRooms } from '@/hooks/useWorkRooms'
import { useRoomChat } from '@/hooks/useRoomChat'
import { useNotes } from '@/hooks/useNotes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Send, Users, FileText, Copy, Share, Wifi, WifiOff } from 'lucide-react'
import { Database } from '@/integrations/supabase/types'
import { useToast } from '@/hooks/use-toast'
import SharedNoteDialog from '@/components/SharedNoteDialog'
import NotificationAPIWidget from '@/components/NotificationAPIWidget'

type WorkRoom = Database['public']['Tables']['work_rooms']['Row']

export default function WorkRoom() {
  const { roomId } = useParams()
  const { user } = useAuth()
  const { rooms, getRoomMembers, shareNoteToRoom, getRoomSharedNotes } = useWorkRooms()
  const { messages, sendMessage, notificationAPI } = useRoomChat(roomId || '')
  const { notes } = useNotes()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [room, setRoom] = useState<WorkRoom | null>(null)
  const [members, setMembers] = useState<any[]>([])
  const [sharedNotes, setSharedNotes] = useState<any[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [selectedNoteId, setSelectedNoteId] = useState<string>('')
  const [selectedShared, setSelectedShared] = useState<any | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const currentRoom = rooms.find(r => r.id === roomId)

  useEffect(() => {
    if (currentRoom) {
      setRoom(currentRoom)
      loadRoomData()
    }
  }, [currentRoom, roomId])

  const loadRoomData = async () => {
    if (!roomId) return

    const [membersData, notesData] = await Promise.all([
      getRoomMembers(roomId),
      getRoomSharedNotes(roomId)
    ])

    setMembers(membersData)
    setSharedNotes(notesData)
  }

  // Set up real-time subscriptions for members and notes
  useEffect(() => {
    if (!roomId) return

    const memberChannel = supabase
      .channel(`room-members-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'room_members',
          filter: `room_id=eq.${roomId}`
        },
        () => {
          // Reload member data when changes occur
          getRoomMembers(roomId).then(setMembers)
        }
      )
      .subscribe()

    const notesChannel = supabase
      .channel(`room-shared-notes-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'room_shared_notes',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          // Reload shared notes when changes occur
          getRoomSharedNotes(roomId).then(setSharedNotes)
          
          // Show notification for new shared notes
          if (payload.eventType === 'INSERT' && payload.new.shared_by_user_id !== user?.id) {
            toast({
              title: "New note shared!",
              description: "A new note has been shared in this room",
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(memberChannel)
      supabase.removeChannel(notesChannel)
    }
  }, [roomId, getRoomMembers, getRoomSharedNotes])

  // Auto-scroll chat to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!messageInput.trim()) return

    const success = await sendMessage(messageInput)
    if (success) {
      setMessageInput('')
    }
  }

  const handleShareNote = async () => {
    if (!selectedNoteId || !roomId) return

    const success = await shareNoteToRoom(roomId, selectedNoteId)
    if (success) {
      setSelectedNoteId('')
      loadRoomData()
    }
  }

  const handleCopyCode = () => {
    if (room) {
      navigator.clipboard.writeText(room.code)
      toast({
        title: "Code copied!",
        description: "Room code has been copied to clipboard",
      })
    }
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Room not found</h2>
          <Button onClick={() => navigate('/workrooms')}>
            Back to Work Rooms
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/workrooms')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <div>
              <h1 className="text-2xl font-bold text-foreground">{room.name}</h1>
              {room.description && (
                <p className="text-sm text-muted-foreground">{room.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* NotificationAPI Connection Status */}
            <div className="flex items-center gap-2">
              {notificationAPI?.isConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-green-500">Real-time connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs text-yellow-500">Connecting...</span>
                </>
              )}
            </div>
            
            <Badge variant="outline" className="font-mono">
              {room.code}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleCopyCode}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Area */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Room Chat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <ScrollArea className="h-96 border rounded-md p-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div key={message.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-medium">
                              {(message.profiles?.full_name || message.profiles?.email || 'User')
                                .split(' ')
                                .map(n => n[0])
                                .join('')
                                .substring(0, 2)
                                .toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">
                                {message.profiles?.full_name || message.profiles?.email || 'User'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(message.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm text-foreground break-words">
                              {message.message}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={bottomRef} />
                    </div>
                  </ScrollArea>

                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" size="sm">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Tabs defaultValue="members" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="share">Share</TabsTrigger>
                <TabsTrigger value="realtime">Real-time</TabsTrigger>
              </TabsList>

              <TabsContent value="members" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Members ({members.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {members.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-2 rounded-md border">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-medium">
                                  {(member.profiles?.full_name || member.profiles?.email || 'U')[0]}
                                </span>
                              </div>
                              <span className="text-sm font-medium">
                                {member.profiles?.full_name || member.profiles?.email || 'Unknown'}
                              </span>
                            </div>
                            {member.role === 'admin' && (
                              <Badge variant="secondary" className="text-xs">
                                Admin
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Shared Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {sharedNotes.map((sharedNote) => (
                          <div key={sharedNote.id} onClick={() => setSelectedShared(sharedNote)} className="p-3 rounded-md border space-y-2 cursor-pointer hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium line-clamp-1">
                                {sharedNote.note?.title}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Shared by {sharedNote.profiles?.full_name || sharedNote.profiles?.email}
                            </p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => navigate('/notes')}
                              className="mt-2 text-xs h-6"
                            >
                              View in Library
                            </Button>
                          </div>
                        ))}
                        
                        {sharedNotes.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No notes shared yet
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="share" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Share a Note</CardTitle>
                    <CardDescription>
                      Share one of your notes with this room
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select value={selectedNoteId} onValueChange={setSelectedNoteId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a note to share" />
                      </SelectTrigger>
                      <SelectContent>
                        {notes
                          .filter(note => note.processing_status === 'completed')
                          .map((note) => (
                          <SelectItem key={note.id} value={note.id}>
                            {note.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button 
                      onClick={handleShareNote} 
                      disabled={!selectedNoteId}
                      className="w-full"
                    >
                      <Share className="h-4 w-4 mr-2" />
                      Share Note
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="realtime" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Real-time Messaging</CardTitle>
                    <CardDescription>
                      NotificationAPI integration for instant messaging
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">Status:</span>
                        {notificationAPI?.isConnected ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Initializing...
                          </Badge>
                        )}
                      </div>
                      
                      {roomId && <NotificationAPIWidget roomId={roomId} />}
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>• Real-time message delivery with NotificationAPI</p>
                        <p>• Messages stored in Supabase for persistence</p>
                        <p>• Enhanced with typing indicators and delivery receipts</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <SharedNoteDialog
          open={!!selectedShared}
          note={selectedShared?.note}
          onOpenChange={(open) => { if (!open) setSelectedShared(null) }}
        />
      </div>
    </div>
  )
}