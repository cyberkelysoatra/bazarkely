// Pilotage space of Joël (VALIDCLIENT-CC-03): own lazy chunk, never downloaded by a client (the
// guard in ValidationApp asks the server first). Screens 10, 10 bis, 12 and 13.
import { Navigate, Route, Routes } from 'react-router-dom';
import Tableau from './Tableau';
import Fiche from './Fiche';
import Import from './Import';
import Questionnaire from './Questionnaire';

export default function Pilotage() {
  return (
    <Routes>
      <Route index element={<Tableau />} />
      <Route path="client/:id/fiche" element={<Fiche />} />
      <Route path="questionnaire/:id" element={<Questionnaire />} />
      <Route path="import/:client" element={<Import />} />
      <Route path="*" element={<Navigate to="/pilotage" replace />} />
    </Routes>
  );
}
