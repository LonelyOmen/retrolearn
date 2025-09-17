import { useNotes } from "@/hooks/useNotes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Eye, Calendar, FileText, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface NotesListProps {
  onViewNote: (note: any) => void;
  notesType?: 'regular' | 'shared';
}

export function NotesList({ onViewNote, notesType = 'regular' }: NotesListProps) {
  const { notes, sharedNotes, loading, deleteNote } = useNotes();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const displayNotes = notesType === 'shared' ? sharedNotes : notes;

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteNote(id);
    setDeletingId(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'pending': return 'outline';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Ready';
      case 'processing': return 'Processing';
      case 'pending': return 'Pending';
      case 'error': return 'Error';
      default: return status;
    }
  };

  if (loading) {
    return (
      <Card className="border-2 border-primary scanlines">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <CardTitle className="font-retro glow-text">MY NOTES</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="font-retro text-muted-foreground">Loading notes...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (displayNotes.length === 0) {
    const title = notesType === 'shared' ? 'SHARED NOTES' : 'MY NOTES';
    const description = notesType === 'shared' 
      ? 'Notes shared with you from work rooms will appear here'
      : 'Your transformed notes will appear here';
    const emptyMessage = notesType === 'shared'
      ? 'No shared notes yet'
      : 'No notes yet';
    const emptySubtext = notesType === 'shared'
      ? 'When someone shares notes in your work rooms, they\'ll appear here'
      : 'Start by transforming some notes to see them here';

    return (
      <Card className="border-2 border-primary scanlines">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <CardTitle className="font-retro glow-text">{title}</CardTitle>
          </div>
          <CardDescription className="font-retro">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <div className="font-retro text-muted-foreground mb-2">{emptyMessage}</div>
            <div className="text-sm font-retro text-muted-foreground">
              {emptySubtext}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const title = notesType === 'shared' ? 'SHARED NOTES' : 'MY NOTES';

  return (
    <Card className="border-2 border-primary scanlines">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <CardTitle className="font-retro glow-text">{title}</CardTitle>
          </div>
          <Badge variant="secondary" className="font-retro">
            {displayNotes.length} notes
          </Badge>
        </div>
        <CardDescription className="font-retro">
          {notesType === 'shared' 
            ? 'Notes shared with you from work rooms' 
            : 'Your transformed notes and study materials'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {displayNotes.map((note) => (
              <Card key={note.id} className="border border-secondary">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-retro font-semibold truncate">{note.title}</h3>
                        <Badge variant={getStatusColor(note.processing_status)} className="text-xs font-retro">
                          {getStatusText(note.processing_status)}
                        </Badge>
                      </div>
                      
                      {notesType === 'shared' && (note as any).shared_from_profile && (
                        <div className="text-xs text-accent font-retro">
                          Shared by: {(note as any).shared_from_profile.full_name || (note as any).shared_from_profile.email}
                        </div>
                      )}
                      
                      <p className="text-sm text-muted-foreground font-retro line-clamp-2">
                        {note.original_content?.slice(0, 120)}
                        {note.original_content?.length > 120 ? '...' : ''}
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-retro">
                        <Calendar className="w-3 h-3" />
                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {note.processing_status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewNote(note)}
                          className="font-retro text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          VIEW
                        </Button>
                      )}
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(note.id)}
                        disabled={deletingId === note.id}
                        className="font-retro text-xs"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        {deletingId === note.id ? 'DEL...' : 'DEL'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}