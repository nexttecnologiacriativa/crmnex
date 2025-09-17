
import { Separator } from "@/components/ui/separator";

const Footer = () => {
  return (
    <footer className="bg-nexcrm-blue text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold text-nexcrm-green mb-4">
              NexCRM
            </h3>
            <p className="text-gray-400 mb-4 max-w-md">
              O CRM Inteligente para o Marketing Digital. Rastreie UTMs, gerencie leads e maximize conversões com a plataforma criada especialmente para negócios digitais.
            </p>
            <div className="text-nexcrm-green font-medium">
              🔗 www.nexcrm.com.br
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Recursos</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Rastreamento UTM</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Gestão de Leads</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pipelines</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Dashboard</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Webhooks</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Suporte</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Documentação</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Status do Sistema</a></li>
            </ul>
          </div>
        </div>
        
        <Separator className="bg-gray-800 mb-8" />
        
        <div className="flex flex-col md:flex-row justify-between items-center text-gray-400">
          <div className="mb-4 md:mb-0">
            <p>&copy; 2024 NexCRM. Todos os direitos reservados.</p>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Termos</a>
            <a href="#" className="hover:text-white transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
