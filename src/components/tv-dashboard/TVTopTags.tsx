import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Hash } from 'lucide-react';

export default function TVTopTags() {
  const { currentWorkspace } = useWorkspace();

  const { data: tagRelations = [] } = useQuery({
    queryKey: ['tv-top-tags', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('lead_tag_relations')
        .select(`
          tag_id,
          lead_tags!inner(name, workspace_id)
        `)
        .eq('lead_tags.workspace_id', currentWorkspace.id);

      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 30000,
  });

  const topTags = useMemo(() => {
    const tagCount = new Map<string, number>();
    
    tagRelations.forEach(relation => {
      if (relation.lead_tags?.name) {
        const tagName = relation.lead_tags.name;
        tagCount.set(tagName, (tagCount.get(tagName) || 0) + 1);
      }
    });

    return Array.from(tagCount.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [tagRelations]);

  const colors = [
    'bg-purple-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-red-500',
    'bg-cyan-500',
  ];

  return (
    <Card className="h-full glass-morphism border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Hash className="h-5 w-5" />
          Top Tags
          <motion.span
            className="inline-block w-2 h-2 bg-cyan-400 rounded-full"
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {topTags.map((item, index) => (
            <motion.div
              key={item.tag}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                delay: index * 0.1,
                type: "spring",
                stiffness: 200
              }}
              whileHover={{ scale: 1.1 }}
            >
              <Badge 
                className={`${colors[index % colors.length]} text-white border-0 px-4 py-2 text-sm font-bold shadow-lg hover:shadow-xl transition-shadow`}
              >
                {item.tag}
                <motion.span 
                  className="ml-2 bg-white/30 rounded-full px-2 py-0.5"
                  key={`count-${item.count}`}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {item.count}
                </motion.span>
              </Badge>
            </motion.div>
          ))}
        </div>
        
        {topTags.length === 0 && (
          <p className="text-white/60 text-center py-8">Nenhuma tag encontrada</p>
        )}
      </CardContent>
    </Card>
  );
}
