-- Trigger para sincronizar media_url automaticamente quando permanent_audio_url for atualizado em mensagens de áudio
create or replace function sync_audio_media_url()
returns trigger language plpgsql as $$
begin
  if new.message_type = 'audio' and new.permanent_audio_url is not null then
    new.media_url := new.permanent_audio_url;
  end if;
  return new;
end $$;

drop trigger if exists trg_sync_audio_media_url on whatsapp_messages;
create trigger trg_sync_audio_media_url
before insert or update of permanent_audio_url on whatsapp_messages
for each row execute procedure sync_audio_media_url();