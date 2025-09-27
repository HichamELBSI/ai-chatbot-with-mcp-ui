import '@progress/kendo-theme-default/dist/all.css';
import {
    Grid,
    GridColumn as Column,
    GridCustomCellProps,
} from '@progress/kendo-react-grid';
import { Button } from '@progress/kendo-react-buttons';
import { Avatar } from '@progress/kendo-react-layout';
import { useMemo } from 'react';
import { userIcon } from '@progress/kendo-svg-icons';

export interface Product {
    ProductID: number;
    ProductName?: string;
    FirstOrderedOn?: Date;
    UnitsInStock?: number;
    Discontinued?: boolean;
    inEdit?: boolean | string;
}

const PersonCell = (props: GridCustomCellProps) => {
    const url = props.dataItem[props.field || ''];

    return url ? (
        <td {...props.tdProps}>
          <Avatar  rounded={'full'} type="image">
            <img
                src={url}
                alt="avatar"
                style={{ width: 32, height: 32}}
                />
          </Avatar>
        </td>
    ) : (
        <td />
    );
}

const EmployeeCell = (props: GridCustomCellProps) => {
    const employeeNames = props.dataItem[props.field || ''].split(', ');

    return (
        <td style={{ display: 'flex', gap: '5px' }} {...props.tdProps}>
          {employeeNames.map((p: string) => (
            <Button svgIcon={userIcon} onClick={() => {
              window.parent?.postMessage(
                {
                  type: 'ui-action',
                  payload: {
                    params: `Show me the all the information about ${p}`
                  }
                },
                '*'
              );
            }}>
              {p}
            </Button>
          ))}
        </td>
    );
}

const makeActionCell =
  (data: any) =>
  (props: GridCustomCellProps) => {
    const row = props.dataItem || {};
    const currentTable = data?.filters?.table; // "user" | "tasks" | "project" | "user_task"

    // Helper to post a UI action back to the parent
    const postTool = (params: any) => {
      window.parent?.postMessage(
        {
          type: 'ui-action',
          payload: {
            params
          }
        },
        '*'
      );
    };

    // Build sensible defaults per current table + row
    const onShowTasks = () => {
        postTool(`Show me 10 tasks assigned to ${row.Firstname} ${row.Lastname}`)
    };

    const onShowProjects = () => {
      postTool(`Show me 10 project where ${row.Firstname} ${row.Lastname} has tasks`)
    };

    return (
      <td {...props.tdProps}>
        <div style={{ display: 'flex', gap: 8 }}>
            <Button type="button" className="action-button" onClick={onShowTasks}>Tasks</Button>
            <Button type="button" className="action-button" onClick={onShowProjects} themeColor={'primary'}>
                Projects
            </Button>
        </div>
      </td>
    );
  };

export const KendoTable = ({data}: any) => {
    const ActionCell = useMemo(() => makeActionCell(data), [data]);
    const currentTable = data?.filters?.table;
    const isUserTable = currentTable === "user";

    return (
        <Grid data={data.rows}>
            {data.columns.map((c) => {
              if (c.field === 'Avatar') return (
                <Column
                    key={c.field}
                    field={c.field}
                    title={c.title ?? c.field}
                    cells={{
                        data: PersonCell
                    }}
                    width="70px"
                />
              )

              if (c.field === "employee_name") return (
                <Column
                    key={c.field}
                    field={c.field}
                    title={c.title ?? c.field}
                    cells={{
                        data: EmployeeCell
                    }}
                    // width="70px"
                />
              )

              return (
                <Column key={c.field} field={c.field} title={c.title ?? c.field} />
              )
            })}
            {isUserTable && <Column title="Actions" cells={{ data: ActionCell }} width="160px" />}
        </Grid>
    );
};

export default KendoTable;