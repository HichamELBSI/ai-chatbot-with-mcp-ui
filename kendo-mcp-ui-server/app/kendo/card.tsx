import {
    Card as KendoCard,
    CardHeader,
    CardTitle,
    CardBody,
    CardActions,
    CardSubtitle,
    Avatar,
    CardImage
} from '@progress/kendo-react-layout';
import { starIcon, starOutlineIcon } from '@progress/kendo-svg-icons';
import { Button } from '@progress/kendo-react-buttons';
import { SvgIcon } from '@progress/kendo-react-common';

export const Card = ({data}: any) => {
    console.log({data})

    const handleSeeTasks = () => {
        window.parent?.postMessage(
            {
                type: 'ui-action',
                payload: {
                params: `Show me the all the tasks assigned to ${data.user.firstname} ${data.user.lastname}`
                }
            },
            '*'
            );
    }

    return (
        <KendoCard orientation="horizontal">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
                <CardImage src={data.user.avatar_url} />
            </div>
            <div className="k-vbox" style={{ width: '100%' }}>
                <CardHeader>
                    <CardTitle>{data.user.firstname} {data.user.lastname}</CardTitle>
                    <CardSubtitle>
                        <span className="reviews">
                            <SvgIcon icon={starIcon} style={{ color: '#ffce2a' }} />
                            <SvgIcon icon={starIcon} style={{ color: '#ffce2a' }} />
                            <SvgIcon icon={starIcon} style={{ color: '#ffce2a' }} />
                            <SvgIcon icon={starIcon} style={{ color: '#ffce2a' }} />
                            <SvgIcon icon={starOutlineIcon} />
                            <div>{data.taskCounts.todo} tasks to do</div>
                            <div>{data.taskCounts.in_progress} tasks in progress</div>
                            <div>{data.taskCounts.done} tasks done</div>
                        </span>
                    </CardSubtitle>
                </CardHeader>
                <CardBody>
                    <p>
                        {`${data.user.firstname}.${data.user.lastname}@abc.com`}
                    </p>
                </CardBody>
                <CardActions>
                    <Button onClick={handleSeeTasks} fillMode="flat" themeColor={'primary'} type="button">
                        See all tasks
                    </Button>
                </CardActions>
            </div>
        </KendoCard>
    )
}