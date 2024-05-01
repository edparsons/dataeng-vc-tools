import { Metadata } from "next"

import { DataTable } from "@/src/components/tables/DataTable"
import { createServerSupabaseClient } from "@/src/lib/supabase-server"
import { Tool, columns, rowClick } from "./columns"
import { AddToolDialog } from "./AddToolDialog"

export const metadata: Metadata = {
  title: "DataEng.vc - Tools",
}

export default async function ToolsPage() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.from('tools').select('*, reviews (id, price)').eq('status', 'approved').order('name');
  const tools = data as Tool[];

  return (
    <>
      <div className="h-full flex-1 flex-col space-y-8 p-2 md:p-8 md:flex">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Tools</h2>
            <p className="text-muted-foreground">
              Here&apos;s a list of all the tools DataEng.vc is tracking.
            </p>
          </div>
          <div className="flex items-center space-x-2">
          </div>
        </div>
        <div>
          <AddToolDialog />
        </div>
        <DataTable 
          data={tools ?? []} 
          columns={columns}
          filterLabel="tools"
          rowOnClick={rowClick}
          />
      </div>
    </>
  )
}
